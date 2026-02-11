import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [], // Normalized state shape - items array
            addItem: (product) => {
                const items = get().items
                const existingItem = items.find((item) => item.id === product.id)

                if (existingItem) {
                    set({
                        items: items.map((item) =>
                            item.id === product.id
                                ? { 
                                    ...item, 
                                    quantity: item.quantity + 1, 
                                    price: product.price, 
                                    selectedOption: product.selectedOption,
                                    // Preserve cooking requests if provided and not empty, otherwise keep existing
                                    cookingRequests: (product.cookingRequests && Object.values(product.cookingRequests).some(v => v)) 
                                        ? product.cookingRequests 
                                        : (item.cookingRequests || {}),
                                    cookingInstructions: product.cookingInstructions || item.cookingInstructions || '',
                                    noGarlic: product.noGarlic !== undefined ? product.noGarlic : (item.noGarlic || false),
                                    noOnion: product.noOnion !== undefined ? product.noOnion : (item.noOnion || false),
                                    customInstructions: product.customInstructions || item.customInstructions || ''
                                }
                                : item
                        ),
                    })
                } else {
                    set({ items: [...items, { ...product, quantity: 1 }] })
                }
            },
            updateItemCookingRequests: (productId, cookingRequests) => {
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, cookingRequests } : item
                    ),
                })
            },
            updateItemCookingInstructions: (productId, cookingInstructions) => {
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, cookingInstructions } : item
                    ),
                })
            },
            removeItem: (productId) => {
                set({
                    items: get().items.filter((item) => item.id !== productId),
                })
            },
            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId)
                    return
                }
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    ),
                })
            },
            updateItemOption: (productId, selectedOption, price) => {
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, selectedOption, price } : item
                    ),
                })
            },
            clearCart: () => set({ items: [] }),
            // No derived state stored - total is computed on demand
            total: () => {
                return get().items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                )
            },
        }),
        {
            name: 'cart-storage',
            version: 1, // Versioned persisted state
            // State persistence scoped to cart only
        }
    )
)
