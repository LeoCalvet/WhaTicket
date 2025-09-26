import { Op, Sequelize } from "sequelize"; // Importar Sequelize
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

const DistributeTicketQueueService = async (
  queueId: number
): Promise<User | null> => {
  const queue = await Queue.findByPk(queueId, {
    include: [{ model: User, as: "users", attributes: ["id", "name"] }],
  });

  if (!queue || !queue.users || queue.users.length === 0) {
    return null;
  }

  const userIds = queue.users.map(u => u.id);

  const usersWithOpenTickets = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: [
      "id",
      "name",
      [Sequelize.fn("COUNT", Sequelize.col("tickets.id")), "openTickets"],
    ],
    include: [
      {
        model: Ticket,
        as: "tickets",
        where: { status: "open" },
        required: false,
        attributes: [],
      },
    ],
    group: ["User.id"],
    order: [[Sequelize.literal("openTickets"), "ASC"]],
  }) as User[];

  const leastBusyUser = usersWithOpenTickets[0];
  const leastBusyUsers = usersWithOpenTickets.filter(
    u => (u.get("openTickets") as number) === (leastBusyUser.get("openTickets") as number)
  );

  // Se houver apenas um usuário menos ocupado, ou se a carga não for zero, retorne ele.
  if (leastBusyUsers.length === 1 || (leastBusyUser.get("openTickets") as number) > 0) {
    const chosenUser = await User.findByPk(leastBusyUser.id);
    if (chosenUser) {
      await queue.update({ lastAssignedUserId: chosenUser.id });
      return chosenUser;
    }
    return null;
  }

  // Se chegamos aqui, temos um empate com 0 tickets. Hora do rodízio.
  const lastUserId = queue.lastAssignedUserId;
  let nextUserIndex = 0;

  if (lastUserId) {
    const lastUserIndex = queue.users.findIndex(u => u.id === lastUserId);
    if (lastUserIndex !== -1) {
      nextUserIndex = (lastUserIndex + 1) % queue.users.length;
    }
  }

  const nextUser = queue.users[nextUserIndex];
  await queue.update({ lastAssignedUserId: nextUser.id });

  return await User.findByPk(nextUser.id);
};

export default DistributeTicketQueueService;
