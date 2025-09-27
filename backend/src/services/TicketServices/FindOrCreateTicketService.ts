import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import Whatsapp from "../../models/Whatsapp";
import DistributeTicketQueueService from "./DistributeTicketQueueService";
import Queue from "../../models/Queue";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages
      });
    }
  }

  if (!ticket) {
    const whatsapp = await Whatsapp.findByPk(whatsappId, {
      include: [{
        model: Queue,
        as: "queues"
      }]
    });

    const defaultQueue = whatsapp?.queues?.[0];

    let userId: number | null = null;
    let status: string = "pending";

    if (defaultQueue?.autoDistribution) {
      const nextUser = await DistributeTicketQueueService(defaultQueue.id);
      if (nextUser) {
        userId = nextUser.id;
        status = "open";
      }
    }

    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status,
      userId,
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      queueId: defaultQueue?.id
    });
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
