// test haskell compile endpoint

const request = require('supertest');
const app = require('../index');

describe('Haskell Compile Endpoint', () => {
    it('should compile haskell code', async () => {
        const response = await request(app)
            .post('/compile/haskell')
            .send({ code: 'main = putStrLn "Hello, World!"' });
        expect(response.status).toBe(200);
        expect(response.body.output).toBe('Hello, World!');
    });
});


describe('Plutus Compile Endpoint', () => {
    it('should compile plutus code', async () => {
        const response = await request(app)
            .post('/compile/plutus')
            .send({ code: 'main = putStrLn "Hello, World!"' });
    });
}); 