import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Unique ID per cart line (same product + same customization = same line)
const hashCode = (str) => {
    let h = 0
    const s = String(str || '')
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return Math.abs(h).toString(36)
}

export const getCartLineId = (product) => {
    const sig = [
        product.id,
        product.selectedOption || '',
        !!product.noGarlic,
        !!product.noOnion,
        (product.customInstructions || '').trim(),
        JSON.stringify(product.cookingRequests || {}),
        (product.cookingInstructions || '').trim()
    ].join('::')
    return `${product.id}_${hashCode(sig)}`
}

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            addItem: (product) => {
                const items = get().items
                const lineId = getCartLineId(product)
                const existingItem = items.find((item) => (item.cartLineId || getCartLineId(item)) === lineId)

                if (existingItem) {
                    set({
                        items: items.map((item) => {
                            const itemLineId = item.cartLineId || getCartLineId(item)
                            if (itemLineId === lineId) {
                                return { ...item, quantity: item.quantity + 1, cartLineId: lineId }
                            }
                            return item.cartLineId ? item : { ...item, cartLineId: itemLineId }
                        }),
                    })
                } else {
                    set({ items: [...items, { ...product, quantity: 1, cartLineId: lineId }] })
                }
            },
            updateItemCookingRequests: (cartLineId, cookingRequests) => {
                set({
                    items: get().items.map((item) => {
                        const lid = item.cartLineId || getCartLineId(item)
                        return lid === cartLineId ? { ...item, cookingRequests } : item
                    }),
                })
            },
            updateItemCookingInstructions: (cartLineId, cookingInstructions) => {
                set({
                    items: get().items.map((item) => {
                        const lid = item.cartLineId || getCartLineId(item)
                        return lid === cartLineId ? { ...item, cookingInstructions } : item
                    }),
                })
            },
            removeItem: (cartLineId) => {
                set({
                    items: get().items.filter((item) => (item.cartLineId || getCartLineId(item)) !== cartLineId),
                })
            },
            updateQuantity: (cartLineId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(cartLineId)
                    return
                }
                set({
                    items: get().items.map((item) => {
                        const lid = item.cartLineId || getCartLineId(item)
                        return lid === cartLineId ? { ...item, quantity } : item
                    }),
                })
            },
            updateItemOption: (cartLineId, selectedOption, price) => {
                set({
                    items: get().items.map((item) => {
                        const lid = item.cartLineId || getCartLineId(item)
                        if (lid !== cartLineId) return item
                        const updated = { ...item, selectedOption, price }
                        return { ...updated, cartLineId: getCartLineId(updated) }
                    }),
                })
            },
            clearCart: () => set({ items: [] }),
            total: () => {
                return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
            },
        }),
        {
            name: 'cart-storage',
            version: 2,
            migrate: (persistedState, version) => {
                if (version === 1 && persistedState?.state?.items) {
                    const items = persistedState.state.items.map((item) => ({
                        ...item,
                        cartLineId: item.cartLineId || getCartLineId(item),
                    }))
                    return { ...persistedState, state: { ...persistedState.state, items } }
                }
                return persistedState
            },
        }
    )
)
