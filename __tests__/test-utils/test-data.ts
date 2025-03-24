import { faker } from '@faker-js/faker';

export const generateUser = () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  createdAt: faker.date.past().toISOString(),
});

export const generatePost = () => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(),
  authorId: faker.string.uuid(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
});

export const generateComment = () => ({
  id: faker.string.uuid(),
  content: faker.lorem.paragraph(),
  authorId: faker.string.uuid(),
  postId: faker.string.uuid(),
  createdAt: faker.date.past().toISOString(),
});

export const generateTestData = (count: number = 5) => ({
  users: Array.from({ length: count }, generateUser),
  posts: Array.from({ length: count }, generatePost),
  comments: Array.from({ length: count }, generateComment),
});
