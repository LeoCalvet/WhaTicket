import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  searchParam: string;
  pageNumber?: string;
  ticketId: string;
}

interface Response {
  messages: Message[];
  count: number;
  hasMore: boolean;
}

const SearchMessagesService = async ({
  searchParam,
  pageNumber = "1",
  ticketId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const whereCondition = {
    ticketId,
    body: {
      [Op.like]: `%${searchParam}%`
    }
  };

  const { count, rows: messages } = await Message.findAndCountAll({
    where: whereCondition,
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    count,
    hasMore
  };
};

export default SearchMessagesService;
