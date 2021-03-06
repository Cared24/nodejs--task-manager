const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const { userOne, userOneId, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should sign up a new user', async () => {
    const res = await request(app)
        .post('/users')
        .send({
            name: 'Jason Todd',
            email: 'jason@example.com',
            password: 'test'
        }).expect(201)

    // Assert that the database was changed correctly
    const user = await User.findById(res.body.user._id);
    expect(user).not.toBeNull();

    // Assertions about the response
    expect(res.body).toMatchObject({
        user: {
            name: 'Jason Todd',
            email: 'jason@example.com',
        },
        token: user.tokens[0].token
    });
    expect(user.password).not.toBe('test');
});

test('Should login existing user', async () => {
    const res = await request(app)
        .post('/users/login')
        .send({
            email: userOne.email,
            password: userOne.password
        }).expect(200);

    const user = await User.findById(userOneId);
    expect(res.body.token).toBe(user.tokens[1].token);
});

test('Should not login non-existent user', async () => {
    await request(app)
        .post('/users/login')
        .send({
            email: 'nonregistereduser@test.com',
            password: 'fakePassword'
        }).expect(400);
});

test('Should get profile for user', async () => {
    await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)
});

test('Should not get profile for unauthenticated user', async () => {
    const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer noToken`)
        .send()
        .expect(401)
});

test('Should delete account for user', async () => {
    const res = await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const user = await User.findById(userOneId);
    expect(user).toBeNull();
});

test('Should not delete account for unauthenticated user', async () => {
    await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer fakeToken`)
        .send()
        .expect(401)
});

test('Should upload avatar image', async () => {
    await request(app)
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('avatar', 'tests/fixtures/profile.jpg')
        .expect(200)

    const user = await User.findById(userOneId);
    expect(user.avatar).toEqual(expect.any(Buffer));
});

test('Should update valid user fields', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: 'Charles'
        })
        .expect(200)

    const user = await User.findById(userOneId);
    expect(user.name).toBe('Charles')
});

test('Should not update valid user fields', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            location: 'New York'
        })
        .expect(400)

    const user = await User.findById(userOneId);
    expect(user.location).toBe(undefined);
});
