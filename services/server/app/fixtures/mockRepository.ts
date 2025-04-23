export const mockRepository = () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  upsert: jest.fn(),
  createQueryBuilder: jest.fn(),
});
