import { ApolloServer } from '@apollo/server';
import {
    startStandaloneServer
} from '@apollo/server/standalone';
import { storefront } from './shopify';

const typeDefs = `#graphql
type Query {
    hello: String
    shopName: String!
}`;


const resolvers = {
    Query: {
        hello: () => 'Hello from SOLA API',
        shopName: async () => {
            const data = await storefront<{ shop: { name: string } }>(`{shop {name} }`)
            return data.shop.name
        },
    },
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });

console.log(`SOLA API ready at ${url}`);