'use strict';

const Bell = require('../../');
const Code = require('code');
const Hapi = require('hapi');
const Hoek = require('hoek');
const Lab = require('lab');

const Mock = require('../mock');


const internals = {};


const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('google', () => {

    it('authenticates with mock', async (flags) => {

        const mock = await Mock.v2(flags);
        const server = Hapi.server({ host: 'localhost', port: 80 });
        await server.register(Bell);

        const custom = Bell.providers.google();
        Hoek.merge(custom, mock.provider);

        const profile = {
            sub: '1234567890',
            name: 'steve smith',
            given_name: 'steve',
            family_name: 'smith',
            email: 'steve@example.com'
        };

        Mock.override('https://www.googleapis.com/oauth2/v3/userinfo', profile);

        server.auth.strategy('custom', 'bell', {
            password: 'cookie_encryption_password_secure',
            isSecure: false,
            clientId: 'google',
            clientSecret: 'secret',
            provider: custom
        });

        server.route({
            method: '*',
            path: '/login',
            config: {
                auth: 'custom',
                handler: function (request, h) {

                    return request.auth.credentials;
                }
            }
        });

        const res1 = await server.inject('/login');
        const cookie = res1.headers['set-cookie'][0].split(';')[0] + ';';

        const res2 = await mock.server.inject(res1.headers.location);

        const res3 = await server.inject({ url: res2.headers.location, headers: { cookie } });
        expect(res3.result).to.equal({
            provider: 'custom',
            token: '456',
            expiresIn: 3600,
            refreshToken: undefined,
            query: {},
            profile: {
                id: '1234567890',
                displayName: 'steve smith',
                name: {
                    given_name: 'steve',
                    family_name: 'smith'
                },
                email: 'steve@example.com',
                raw: profile
            }
        });
    });
});
