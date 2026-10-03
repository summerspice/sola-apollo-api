const domain = process.env.SHOPIFY_STORE_DOMAIN
const version = process.env.SHOPIFY_API_VERSION
const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN

if (!domain || !version || !token) {
    throw new Error('Missing Shopify settings in .env')
}

const endpoint = `https://${domain}/api/${version}/graphql.json`

// Call Shopify Storefront API with our private token
export async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Shopify-Storefront-Private-Token': token!,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!res.ok) {
        throw new Error(`Shopify HTTP ${res.status}`)
    }

    const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
    if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join(', '))
    }
    return json.data as T
}