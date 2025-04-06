export const createMockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  upsert: jest.fn(),
});

export const mockRepository = createMockRepo();
