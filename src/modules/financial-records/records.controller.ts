import { FastifyRequest, FastifyReply } from 'fastify';
import { RecordsService } from './records.service.js';
import { ListRecordsQuery, CreateRecordInput, UpdateRecordInput } from './records.schema.js';

export class RecordsController {
  constructor(private recordsService: RecordsService) {}

  async listRecords(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const query = request.query as ListRecordsQuery;
    const result = await this.recordsService.listRecords(query, request.user);
    return reply.send(result);
  }

  async getRecordById(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const record = await this.recordsService.getRecordById(params.id, request.user);
    return reply.send(record);
  }

  async createRecord(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const body = request.body as CreateRecordInput;
    const record = await this.recordsService.createRecord(body, request.user);
    return reply.code(201).send(record);
  }

  async updateRecord(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const body = request.body as UpdateRecordInput;
    const record = await this.recordsService.updateRecord(params.id, body, request.user);
    return reply.send(record);
  }

  async deleteRecord(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    await this.recordsService.deleteRecord(params.id, request.user);
    return reply.code(204).send();
  }

  async restoreRecord(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const record = await this.recordsService.restoreRecord(params.id, request.user);
    return reply.send(record);
  }
}
