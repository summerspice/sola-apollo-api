import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { storefront } from './shopify';


const typeDefs = `#graphql
enum ColorGroup {
    Core
    Limited
}

type Money {
    amount: Float!
    currencyCode: String!
}

type Product {
    id: ID!
    handle: String!
    title: String!
    description: String!
    availableForSale: Boolean!
    price: Money!
    imageUrl: String
    styleCode: String
    colorName: String
    swatch: String
    colorGroup: ColorGroup
    colorSiblings: [Product!]!
}

type Query {
    hello: String
    shopName: String!
    product(handle: String!): Product
}`;

type ShopifyProduct = {
    id: string
    handle: string
    title: string
    description: string
    availableForSale: boolean
    tags: string[]
    priceRange: {
        minVariantPrice: {
            amount: string
            currencyCode: string
        }
    }
    featuredImage: {
        url: string
    } | null
    colorName: { value: string } | null
    swatch: { value: string } | null
    colorGroup: { value: string } | null
}

const PRODUCT_FIELDS = `
    id
    handle
    title
    description
    availableForSale
    tags
    priceRange { minVariantPrice { amount currencyCode}}
    featuredImage { url }
    colorName: metafield(namespace: "custom", key: "color_name") { value }
    swatch: metafield(namespace: "custom", key: "swatch") { value }
    colorGroup: metafield(namespace: "custom", key: "color_group" ) { value }
`

const PRODUCT_QUERY = `#graphql
    query ProductByHandle($handle: String!){
        product(handle: $handle) {
            ${PRODUCT_FIELDS}
        }
    }
`

const SIBLINGS_QUERY = `#graphql
    query ProductsByStyle($query: String!){
        products(first: 50, query: $query) {
            nodes { ${PRODUCT_FIELDS} }
        }
    }
`

// ----Mapping: Shopify shape -> our shape -------
function toProduct(p: ShopifyProduct) {
    const styleTag = p.tags.find((t) => t.startsWith('style:'))
    const group = p.colorGroup?.value

    return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        description: p.description,
        availableForSale: p.availableForSale,
        price: {
            amount: Number(p.priceRange.minVariantPrice.amount),
            currencyCode: p.priceRange.minVariantPrice.currencyCode,
        },
        imageUrl: p.featuredImage?.url ?? null,
        styleCode: styleTag ? styleTag.replace('style:', '') : null,
        colorName: p.colorName?.value ?? null,
        swatch: p.swatch?.value ?? null,
        colorGroup: group === 'Core' || group === 'Limited' ? group : null,
    }
}

type Product = ReturnType<typeof toProduct>

const resolvers = {
    Query: {
        hello: () => 'Hello from SOLA API',
        shopName: async () => {
            const data = await storefront<{ shop: { name: string } }>(`{ shop { name } }`)
            return data.shop.name
        },
        product: async (_parent: unknown, args: { handle: string }) => {
            const data = await storefront<{ product: ShopifyProduct | null }>(PRODUCT_QUERY, { handle: args.handle })
            return data.product ? toProduct(data.product) : null
        },
    },

    // Field resolver: runs only when a query asks for colorSiblings
    Product: {
        colorSiblings: async (parent: Product) => {
            if (!parent.styleCode) return []
            const data = await storefront<{ products: { nodes: ShopifyProduct[] } }>(SIBLINGS_QUERY, {
                query: `tag:"style:${parent.styleCode}"`,
            })
            return data.products.nodes.map(toProduct)
        },
    },
}


const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });

console.log(`SOLA API ready at ${url}`);