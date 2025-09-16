import { QueryInterface, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";

const faker = require("faker");

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    console.log("Starting to seed massive ticket...");

    const users = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE email = :email LIMIT 1',
      {
        replacements: { email: "admin@whaticket.com" },
        type: "SELECT",
      }
    );

    const whatsapps = await queryInterface.sequelize.query(
      'SELECT id FROM Whatsapps LIMIT 1',
      { type: "SELECT" }
    );

    if (!users.length || !(users[0] as any).id) {
      console.error("Admin user not found. Please run the default seeders first.");
      throw new Error("Admin user not found.");
    }
    const adminUserId = (users[0] as any).id;
    console.log(`Admin user found with ID: ${adminUserId}`);

    if (!whatsapps.length || !(whatsapps[0] as any).id) {
        console.error("No WhatsApp connection found. Please create at least one connection first.");
        throw new Error("No WhatsApp connection found.");
    }
    const whatsappId = (whatsapps[0] as any).id;
    console.log(`Using WhatsApp connection with ID: ${whatsappId}`);


    await queryInterface.bulkInsert("Contacts", [{
      name: "Contato Teste Performance",
      number: "55999999999",
      email: "performance@test.com",
      isGroup: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    const contacts = await queryInterface.sequelize.query(
        'SELECT id FROM Contacts WHERE number = :number LIMIT 1',
        {
            replacements: { number: "55999999999" },
            type: "SELECT",
        }
    );
    const contactId = (contacts[0] as any).id;
    console.log(`Contact created with ID: ${contactId}`);

    await queryInterface.bulkInsert("Tickets", [{
        contactId: contactId,
        status: "open",
        userId: adminUserId,
        isGroup: false,
        whatsappId: whatsappId,
        createdAt: new Date(),
        updatedAt: new Date(),
    }]);

    const tickets = await queryInterface.sequelize.query(
        'SELECT id FROM Tickets WHERE contactId = :contactId LIMIT 1',
        {
            replacements: { contactId: contactId },
            type: "SELECT",
        }
    );
    const ticketId = (tickets[0] as any).id;
    console.log(`Ticket created with ID: ${ticketId}`);

    const messagesToCreate = [];
    const numberOfMessages = 50000; // 50 mil mensagens
    console.log(`Generating ${numberOfMessages} messages...`);

    for (let i = 0; i < numberOfMessages; i++) {
      messagesToCreate.push({
        id: uuidv4(),
        body: `Esta é a mensagem de teste número ${i + 1}. Palavras-chave para busca: protocolo, fatura, suporte, agendamento. ${faker.lorem.sentences(2)}`,
        fromMe: i % 2 === 0,
        read: true,
        ticketId: ticketId,
        contactId: contactId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log("Inserting messages into the database. This may take a few minutes...");
    await queryInterface.bulkInsert("Messages", messagesToCreate);

    console.log("Massive ticket seeding finished successfully!");
  },

  down: async (queryInterface: QueryInterface) => {
    const contacts = await queryInterface.sequelize.query(
        'SELECT id FROM Contacts WHERE number = :number LIMIT 1',
        {
            replacements: { number: "55999999999" },
            type: "SELECT",
        }
    );
    if(contacts.length > 0) {
        const contactId = (contacts[0] as any).id;
        await queryInterface.bulkDelete("Messages", { contactId: contactId });
        await queryInterface.bulkDelete("Tickets", { contactId: contactId });
        await queryInterface.bulkDelete("Contacts", { id: contactId });
    }
  }
};
