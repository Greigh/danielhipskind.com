import { expect } from 'chai';
import request from 'supertest';
import app from '../server.js';

describe('Auth API', () => {
  let authToken;

  before(async () => {
    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: process.env.AUTH_PASSWORD });

    authToken = res.headers['set-cookie'][0];
  });

  it('should verify valid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Cookie', authToken);

    expect(res.status).to.equal(200);
    expect(res.body.authenticated).to.be.true;
    expect(res.body.expires).to.be.a('string');
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Cookie', 'token=invalid');

    expect(res.status).to.equal(401);
    expect(res.body.authenticated).to.be.false;
  });
});
