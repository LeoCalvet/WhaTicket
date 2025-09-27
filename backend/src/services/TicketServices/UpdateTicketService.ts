import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import DistributeTicketQueueService from "./DistributeTicketQueueService";

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number;
  whatsappId?: number;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);
  await SetTicketMessagesAsRead(ticket);

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;
  const oldQueueId = ticket.queueId;

  if (ticketData.status === "pending") {
    ticketData.userId = null;
  }

  if (ticketData.queueId && ticketData.queueId !== oldQueueId) {
    const queue = await Queue.findByPk(ticketData.queueId);
    if (queue?.autoDistribution) {
      const nextUser = await DistributeTicketQueueService(ticketData.queueId);
      if (nextUser) {
        // Atribui o ticket ao próximo usuário e força o status para "open"
        ticketData.userId = nextUser.id;
        ticketData.status = "open";
      }
    }
  }

  if (ticketData.whatsappId && ticket.whatsappId !== ticketData.whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, ticketData.whatsappId);
  }

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  await ticket.update(ticketData);

  await ticket.reload();

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
