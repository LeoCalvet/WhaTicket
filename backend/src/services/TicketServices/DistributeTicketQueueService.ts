import { Op, Sequelize } from "sequelize";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

const DistributeTicketQueueService = async (
  queueId: number
): Promise<User | null> => {
  const queue = await Queue.findByPk(queueId, {
    include: [{ model: User, as: "users" }],
  });

  if (!queue || !queue.users || queue.users.length === 0) {
    return null;
  }

  const userIds = queue.users.map(u => u.id); // Mapeia os IDs dos usuários

  const usersWithOpenTickets = await User.findAll({
    where: { // consulta em sí
      id: {
        [Op.in]: userIds, // Busca somente users que estao no Queue
      },
    },
    attributes: [ // selecao de colunas
      "id",
      "name",
      [
        Sequelize.fn("COUNT", Sequelize.col("tickets.id")), // criacao de nova coluna chamada openTickets
        "openTickets",
      ],
    ],
    include: [ // juncao de tabelas
      {
        model: Ticket,
        as: "tickets",
        where: {
          status: "open",
        },
        required: false, // Left join para incluir usuários sem tickets abertos
        attributes: [],
      },
    ],
    group: ["User.id"],
    order: [[Sequelize.literal("openTickets"), "ASC"]],
  });

  // Se algum usuário da fila não tiver tickets abertos, ele não aparecerá
  // na query acima. Precisamos encontrá-lo.
  if (usersWithOpenTickets.length < queue.users.length) {
    const usersWithTicketsIds = usersWithOpenTickets.map(u => u.id);
    const userWithoutTickets = queue.users.find(u => !usersWithTicketsIds.includes(u.id));
    if(userWithoutTickets) {
        return userWithoutTickets;
    }
  }

  // O primeiro usuário da lista ordenada será o menos ocupado
  return usersWithOpenTickets[0] || null;
};

export default DistributeTicketQueueService;
