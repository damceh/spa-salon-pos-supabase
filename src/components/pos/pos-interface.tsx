import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Search, Plus, Minus, Trash2, User, ShoppingBag, CreditCard, Receipt, Percent } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { spaConfig, formatCurrency } from '@/config/spa-config'
import type { Service, Product, Customer, CartItem, Transaction } from '@/lib/supabase'

interface POSInterfaceProps {
  onCheckoutComplete?: (transaction: Transaction) => void
}

export function POSInterface({ onCheckoutComplete }: POSInterfaceProps) {
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services')
  const [customerSearch, setCustomerSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)

  const { toast } = useToast()

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [servicesRes, productsRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ])

      if (servicesRes.error) throw servicesRes.error
      if (productsRes.error) throw productsRes.error

      setServices(servicesRes.data || [])
      setProducts(productsRes.data || [])

    } catch (error) {
      console.error('Error loading POS data:', error)
      toast({
        title: "Error",
        description: "Failed to load products and services",
        variant: "destructive",
      })
    }
  }

  // Search customers
  const searchCustomers = async (term: string) => {
    if (term.length < 2) {
      setCustomers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10)

      if (error) throw error
      setCustomers(data || [])

    } catch (error) {
      console.error('Error searching customers:', error)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(customerSearch)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [customerSearch])

  // Cart operations
  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    const existingItem = cart.find(cartItem =>
      cartItem.type === type &&
      (type === 'service' ? cartItem.service_id : cartItem.product_id) === item.id
    )

    if (existingItem) {
      // Only allow quantity > 1 for products
      if (type === 'product') {
        updateQuantity(existingItem.id, existingItem.quantity + 1)
      } else {
        toast({
          title: "Already in Cart",
          description: "This service is already in your cart",
          variant: "destructive",
        })
      }
    } else {
      const cartItem: CartItem = {
        id: crypto.randomUUID(), // Temporary ID for cart
        type,
        quantity: 1,
        unit_price: type === 'service' ? (item as Service).base_price : (item as Product).unit_price,
        line_total: type === 'service' ? (item as Service).base_price : (item as Product).unit_price,
        created_at: new Date().toISOString()
      }

      if (type === 'service') {
        cartItem.service_id = item.id
        cartItem.service_name = (item as Service).name
      } else {
        cartItem.product_id = item.id
        cartItem.product_name = (item as Product).name
      }

      setCart([...cart, cartItem])
    }
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, line_total: item.unit_price * newQuantity }
        : item
    ))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = subtotal * spaConfig.tax.rate
  const discountAmount = 0 // TODO: Implement discount logic
  const totalAmount = subtotal + taxAmount - discountAmount

  // Filter items based on search
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Process checkout
  const handleCheckout = async (paymentMethod: string) => {
    if (cart.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to the cart before checkout",
        variant: "destructive",
      })
      return
    }

    setProcessingPayment(true)

    try {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          customer_id: selectedCustomer?.id || null,
          staff_id: null, // TODO: Get current user ID
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          status: 'paid',
          payment_method: paymentMethod as any,
          payment_reference: `POS-${Date.now()}`,
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        service_id: item.service_id || null,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError

      // Update product stock
      for (const item of cart) {
        if (item.product_id && item.type === 'product') {
          const { error: stockError } = await supabase.rpc('update_product_stock', {
            product_id_param: item.product_id,
            quantity_param: item.quantity
          })

          if (stockError) {
            console.error('Error updating stock:', stockError)
          }
        }
      }

      toast({
        title: "Payment Successful",
        description: `Transaction completed: ${formatCurrency(totalAmount)}`,
      })

      onCheckoutComplete?.(transaction)
      clearCart()

    } catch (error: any) {
      console.error('Checkout error:', error)
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left side - Items */}
      <div className="lg:col-span-2 space-y-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <div className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                  {selectedCustomer.email && (
                    <div className="text-sm text-muted-foreground">{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.phone && (
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setCustomerSearch('')
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by name, phone, or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {customers.length > 0 && (
                  <div className="border rounded-lg max-h-32 overflow-y-auto">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setCustomerSearch('')
                          setCustomers([])
                        }}
                      >
                        <div className="font-medium">
                          {customer.first_name} {customer.last_name}
                        </div>
                        {(customer.email || customer.phone) && (
                          <div className="text-sm text-muted-foreground">
                            {customer.email && customer.phone
                              ? `${customer.email} • ${customer.phone}`
                              : customer.email || customer.phone
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    No customer selected - checkout as guest
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product/Service Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5" />
                Items
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'services' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('services')}
                >
                  Services
                </Button>
                <Button
                  variant={activeTab === 'products' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('products')}
                >
                  Products
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Items Grid */}
              <ScrollArea className="h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(activeTab === 'services' ? filteredServices : filteredProducts).map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => addToCart(item, activeTab)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium line-clamp-2">{item.name}</h4>
                          <span className="font-bold text-lg whitespace-nowrap ml-2">
                            {formatCurrency('base_price' in item ? item.base_price : item.unit_price)}
                          </span>
                        </div>

                        {'description' in item && item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="text-xs text-muted-foreground space-x-2">
                            {'duration_minutes' in item && (
                              <span>{item.duration_minutes} min</span>
                            )}
                            {'stock_quantity' in item && (
                              <span>Stock: {item.stock_quantity}</span>
                            )}
                          </div>

                          {'stock_quantity' in item && item.stock_quantity <= (item as Product).reorder_level && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(activeTab === 'services' ? filteredServices : filteredProducts).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {activeTab} found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Cart */}
      <div className="space-y-6">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 mb-4">
              {cart.length > 0 ? (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">
                            {item.service_name || item.product_name}
                          </h5>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unit_price)} each
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.type === 'product' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {item.type === 'service' && (
                            <Badge variant="secondary" className="text-xs">
                              Service
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium text-sm">
                          {formatCurrency(item.line_total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Add items to get started</p>
                </div>
              )}
            </ScrollArea>

            {/* Order Summary */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Tax ({(spaConfig.tax.rate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleCheckout('cash')}
                  disabled={cart.length === 0 || processingPayment}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {processingPayment ? 'Processing...' : `Pay ${formatCurrency(totalAmount)}`}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  {spaConfig.paymentMethods
                    .filter(method => method.enabled && method.id !== 'cash')
                    .map((method) => (
                      <Button
                        key={method.id}
                        variant="outline"
                        onClick={() => handleCheckout(method.id)}
                        disabled={cart.length === 0 || processingPayment}
                      >
                        {method.name}
                      </Button>
                    ))}
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={clearCart}
                disabled={cart.length === 0}
              >
                Clear Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}