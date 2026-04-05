import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoriesService } from './categories.service.js';
import {
  ListCategoriesQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories.schema.js';

export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  async listCategories(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as ListCategoriesQuery;
    const categories = await this.categoriesService.listCategories(query);
    return reply.send(categories);
  }

  async getCategoryById(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { id: string };
    const category = await this.categoriesService.getCategoryById(params.id);
    return reply.send(category);
  }

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const body = request.body as CreateCategoryInput;
    const category = await this.categoriesService.createCategory(body, request.user);
    return reply.code(201).send(category);
  }

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    const body = request.body as UpdateCategoryInput;
    const category = await this.categoriesService.updateCategory(params.id, body, request.user);
    return reply.send(category);
  }

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const params = request.params as { id: string };
    await this.categoriesService.deleteCategory(params.id, request.user);
    return reply.code(204).send();
  }
}
