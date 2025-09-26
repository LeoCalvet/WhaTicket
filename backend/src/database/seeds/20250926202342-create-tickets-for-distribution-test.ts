import { QueryInterface } from "sequelize";
import { v4 as uuidv4 } from "uuid";

const faker = require("faker");

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    console.log("Starting to seed test environment...");

    // 1. Criar uma conexão de WhatsApp padrão para os testes
    await queryInterface.bulkInsert("Whatsapps", [{
      name: "Wpp Teste",
      status: "CONNECTED",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const whatsapps = await queryInterface.sequelize.query(
      "SELECT id FROM Whatsapps LIMIT 1",
      { type: "SELECT" }
    );
    const whatsappId = (whatsapps[0] as any).id;
    console.log(`Created 'Wpp Teste' connection with ID: ${whatsappId}`);

    // 2. Criar as filas "Vendas" e "Teste"
    await queryInterface.bulkInsert("Queues", [
      {
        name: "Vendas",
        color: "#0066FF",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Teste",
        color: "#FF0000",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);
    const queues = await queryInterface.sequelize.query(
      "SELECT id FROM Queues WHERE name = 'Vendas' LIMIT 1",
      { type: "SELECT" }
    );
    const queueId = (queues[0] as any).id;
    console.log(`Created 'Vendas' and 'Teste' queues.`);


    // 3. Encontrar o usuário Admin
    const users = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE email = :email LIMIT 1",
      {
        replacements: { email: "admin@whaticket.com" },
        type: "SELECT",
      }
    );
    if (!users.length || !(users[0] as any).id) {
      throw new Error("Admin user not found. Please run the default seeders first.");
    }
    const adminUserId = (users[0] as any).id;

    // 4. Criar o contato de performance com 50 mensagens
    console.log("Creating performance test contact and ticket...");
    await queryInterface.bulkInsert("Contacts", [{
      name: "Contato Teste Performance",
      number: "55999999999",
      email: "performance@test.com",
      isGroup: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const perfContacts = await queryInterface.sequelize.query(
        'SELECT id FROM Contacts WHERE number = :number LIMIT 1',
        { replacements: { number: "55999999999" }, type: "SELECT" }
    );
    const perfContactId = (perfContacts[0] as any).id;

    await queryInterface.bulkInsert("Tickets", [{
        contactId: perfContactId,
        status: "open",
        userId: adminUserId,
        isGroup: false,
        whatsappId: whatsappId,
        queueId: queueId,
        createdAt: new Date(),
        updatedAt: new Date(),
    }]);
    const perfTickets = await queryInterface.sequelize.query(
        'SELECT id FROM Tickets WHERE contactId = :contactId LIMIT 1',
        { replacements: { contactId: perfContactId }, type: "SELECT" }
    );
    const perfTicketId = (perfTickets[0] as any).id;

    const messagesToCreate = [];
    const numberOfMessages = 50;
    for (let i = 0; i < numberOfMessages; i++) {
      messagesToCreate.push({
        id: uuidv4(),
        body: `Mensagem de teste ${i + 1}. Palavras-chave: protocolo, fatura. ${faker.lorem.sentences(1)}`,
        fromMe: i % 2 === 0,
        read: true,
        ticketId: perfTicketId,
        contactId: perfContactId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await queryInterface.bulkInsert("Messages", messagesToCreate);
    console.log(`${numberOfMessages} messages created for performance test.`);

    // 5. Criar os 9 contatos para teste de distribuição
    console.log("Creating 9 distribution test contacts...");
    const distContactsToCreate = [];
    for (let i = 1; i <= 9; i++) {
        distContactsToCreate.push({
            name: `Cliente Teste Distribuição ${i}`,
            number: `551199999999${i}`,
            email: `cliente${i}@test.com`,
            isGroup: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    await queryInterface.bulkInsert("Contacts", distContactsToCreate);
    console.log("9 distribution test contacts created successfully.");
    console.log("Seeding finished.");
  },

  down: async (queryInterface: QueryInterface) => {
    // Limpa todos os dados criados por este seeder
    await queryInterface.bulkDelete("Messages", { ticketId: { [require("sequelize").Op.not]: null } });
    await queryInterface.bulkDelete("Tickets", { contactId: { [require("sequelize").Op.not]: null } });
    await queryInterface.bulkDelete("Contacts", { name: { [require("sequelize").Op.like]: "%Teste%" } });
    await queryInterface.bulkDelete("Queues", { name: ["Vendas", "Teste"] });
    await queryInterface.bulkDelete("Whatsapps", { name: "Wpp Teste" });
  }
};
