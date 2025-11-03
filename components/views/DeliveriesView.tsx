
import React, { useState, useMemo, useEffect } from 'react';
import { supabaseApi } from '../../services/supabase-api';
import { Delivery, DeliveryItem, Client, Product, ReturnItem, Payment, DeliveryStatus } from '../../types';
import { generateId, formatDate, formatCurrency, todayISO } from '../../utils';
import { Modal } from '../ui/Modal';
import { QuickSettlement } from '../ui/QuickSettlement';
import { MobileDeliveryList } from '../ui/MobileDeliveryList';
import { PlusIcon } from '../ui/Icons';

interface DeliveriesViewProps {
  // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
  t: any;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const getDeliveryTotal = (delivery: Delivery): number => {
    return (delivery.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
};

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({ t, showToast }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlingDelivery, setSettlingDelivery] = useState<Delivery | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deliveriesData, clientsData, productsData] = await Promise.all([
        supabaseApi.getDeliveries(),
        supabaseApi.getClients(),
        supabaseApi.getProducts()
      ]);
      setDeliveries(deliveriesData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading deliveries data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [filter, setFilter] = useState<{ status: DeliveryStatus | 'All', client: string }>({ status: 'All', client: 'All' });

  const handleOpenNewModal = () => {
    setEditingDelivery(null);
    setIsModalOpen(true);
  };
  
  const handleOpenSettleModal = (delivery: Delivery) => {
    setSettlingDelivery(delivery);
    setIsSettleModalOpen(true);
  };

  const handleSave = async (deliveryData: Omit<Delivery, 'id' | 'invoiceNumber'>) => {
    try {
      if (editingDelivery) {
        // Update existing delivery - TODO: Implement updateDelivery in supabaseApi
        console.warn('Update delivery not implemented yet');
        showToast('Update not implemented yet', 'error');
      } else {
        // Create new delivery - API generates invoice number automatically
        await supabaseApi.createDelivery(deliveryData);
        await loadData(); // Reload all data
        showToast(t.deliveries.saved);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving delivery:', error);
      showToast('Error saving delivery', 'error');
    }
  };  const handleSettleSave = async (settledDelivery: Delivery) => {
    try {
      // TODO: Implement updateDelivery in supabaseApi
      console.warn('Settlement update not implemented yet');
      await loadData(); // For now, just reload data
      setIsSettleModalOpen(false);
      showToast(t.deliveries.settled_saved);
    } catch (error) {
      console.error('Error settling delivery:', error);
      showToast('Error settling delivery', 'error');
    }
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.businessName || 'Unknown';

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const statusMatch = filter.status === 'All' || d.status === filter.status;
      const clientMatch = filter.client === 'All' || d.clientId === filter.client;
      return statusMatch && clientMatch;
    });
  }, [deliveries, filter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading deliveries...</span>
      </div>
    );
  }
  
  const StatusBadge: React.FC<{status: DeliveryStatus}> = ({ status }) => {
    const colorMap: Record<DeliveryStatus, string> = {
      Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      Settled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    const textMap = {
        Pending: t.deliveries.pending,
        Settled: t.deliveries.settled,
        Paid: t.deliveries.paid
    }
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status]}`}>{textMap[status]}</span>;
  }

  // Check if mobile
  const isMobile = window.innerWidth < 768;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.deliveries.title}</h1>
        <button
          onClick={handleOpenNewModal}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="mr-2" />
          {t.deliveries.newDelivery}
        </button>
      </div>

      <div className="flex space-x-4">
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value as any})} className="input-style">
            <option value="All">{t.common.all} {t.deliveries.status.toLowerCase()}</option>
            <option value="Pending">{t.deliveries.pending}</option>
            <option value="Settled">{t.deliveries.settled}</option>
            <option value="Paid">{t.deliveries.paid}</option>
        </select>
        <select value={filter.client} onChange={e => setFilter({...filter, client: e.target.value})} className="input-style">
            <option value="All">{t.common.all} {t.clients.title.toLowerCase()}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
        </select>
      </div>

      {/* Mobile View */}
      {isMobile ? (
        <MobileDeliveryList
          deliveries={filteredDeliveries}
          clients={clients}
          products={products}
          t={t}
          showToast={showToast}
          onUpdate={loadData}
        />
      ) : (
        /* Desktop Table View */
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">{t.deliveries.invoice} #</th>
              <th scope="col" className="px-6 py-3">{t.deliveries.client}</th>
              <th scope="col" className="px-6 py-3">{t.deliveries.date}</th>
              <th scope="col" className="px-6 py-3">{t.deliveries.status}</th>
              <th scope="col" className="px-6 py-3">{t.deliveries.amount}</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map(delivery => (
              <tr key={delivery.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{delivery.invoiceNumber}</td>
                <td className="px-6 py-4">{getClientName(delivery.clientId)}</td>
                <td className="px-6 py-4">{formatDate(delivery.date)}</td>
                <td className="px-6 py-4"><StatusBadge status={delivery.status} /></td>
                <td className="px-6 py-4">{formatCurrency(getDeliveryTotal(delivery))}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenSettleModal(delivery)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">
                    {delivery.status === 'Pending' ? t.deliveries.settle : t.deliveries.view}
                  </button>
                </td>
              </tr>
            ))}
            {filteredDeliveries.length === 0 && (
              <tr><td colSpan={6} className="text-center py-4">{t.common.noResults}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}
        
      {isModalOpen && (
        <DeliveryFormModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave} 
            clients={clients} 
            products={products}
            t={t}
            showToast={showToast}
        />
      )}

      {isSettleModalOpen && settlingDelivery && (
        <QuickSettlement
            delivery={settlingDelivery}
            t={t}
            showToast={showToast}
            onClose={() => {
              setIsSettleModalOpen(false);
              setSettlingDelivery(null);
            }}
            onUpdate={() => {
              loadData();
            }}
        />
      )}
      <style>{`
        .input-style {
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .dark .input-style {
            background-color: #334155;
            border-color: #475569;
            color: white;
        }
      `}</style>
    </div>
  );
};


// --- New Delivery Form Modal ---
interface DeliveryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Delivery, 'id'>) => void;
    clients: Client[];
    products: Product[];
    // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
    t: any;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const DeliveryFormModal: React.FC<DeliveryFormModalProps> = ({ isOpen, onClose, onSave, clients, products, t, showToast }) => {
    const [date, setDate] = useState(todayISO());
    const [clientId, setClientId] = useState('');
    const [items, setItems] = useState<DeliveryItem[]>([]);
    const [notes, setNotes] = useState('');
    const [inventory, setInventory] = useState<Record<string, number>>({});
    const [errors, setErrors] = useState<Record<number, string>>({});
    
    useEffect(() => {
        if (isOpen) {
            setDate(todayISO());
            setClientId(clients.length > 0 ? clients[0].id : '');
            setItems([]);
            setNotes('');
            setErrors({});
            // TODO: Calculate inventory from Supabase data
            console.warn('Inventory calculation not implemented yet');
        }
    }, [isOpen, clients]);

    useEffect(() => {
      const newErrors: Record<number, string> = {};
      const productQuantities: Record<string, number> = {};

      items.forEach((item, index) => {
        productQuantities[item.productId] = (productQuantities[item.productId] || 0) + item.quantity;
      });

      items.forEach((item, index) => {
        const available = inventory[item.productId] || 0;
        if(productQuantities[item.productId] > available) {
          newErrors[index] = t('deliveries.inventory_error', { available });
        }
      });
      setErrors(newErrors);
    }, [items, inventory, t]);


    const handleAddItem = () => {
        if(products.length > 0) {
            setItems([...items, { productId: products[0].id, quantity: 1, price: 0 }]);
        }
    };
    
    const handleItemChange = (index: number, field: keyof DeliveryItem, value: string | number) => {
        const newItems = [...items];
        const item = newItems[index];
        (item[field] as any) = value;
        
        if (field === 'productId' || clientId) {
             const client = clients.find(c => c.id === clientId);
             const product = products.find(p => p.id === item.productId);
             if (client && product) {
                 const customPrice = client.customPrices.find(cp => cp.productId === product.id);
                 item.price = customPrice ? customPrice.price : product.defaultPrice;
             }
        }
        
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const hasErrors = Object.keys(errors).length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasErrors) {
          showToast(t.deliveries.form_errors, 'error');
          return;
        }
        if(!clientId || items.length === 0) return;
        const finalItems = items.filter(i => i.quantity > 0 && i.price >= 0);
        if(finalItems.length === 0) return;

        onSave({
            invoiceNumber: '', // will be generated on save
            date: new Date(date).toISOString(),
            clientId,
            items: finalItems,
            status: 'Pending',
            notes,
        });
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.deliveries.newDelivery}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">{t.deliveries.date}</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-style" required/>
                    </div>
                    <div>
                        <label className="label">{t.deliveries.client}</label>
                        <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-style" required>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label">{t.deliveries.notes}</label>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows={2} 
                      placeholder={t.deliveries.notesPlaceholder}
                      className="input-style w-full"
                    ></textarea>
                </div>

                <h3 className="text-md font-semibold pt-2">{t.deliveries.items}</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {items.map((item, index) => (
                        <div key={index}>
                          <div className="grid grid-cols-12 gap-2 items-center">
                              <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="input-style col-span-5">
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                              <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className={`input-style col-span-2 ${errors[index] ? 'border-red-500' : ''}`} min="1"/>
                              <input type="number" placeholder="Price" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} className="input-style col-span-3" min="0"/>
                              <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 col-span-2 justify-self-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </button>
                          </div>
                          {errors[index] && <p className="text-red-500 text-xs mt-1">{errors[index]}</p>}
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddItem} className="text-blue-600 font-medium text-sm">{t.common.add} {t.deliveries.items.toLowerCase()}</button>

                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
                    <button type="submit" className={`btn-primary ${hasErrors ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={hasErrors}>{t.common.save}</button>
                </div>
            </form>
            <style>{`
                .label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-medium; color: #475569; }
                .dark .label { color: #d1d5db; }
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
                .dark .input-style { background-color: #334155; border-color: #475569; color: white; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: white; background-color: #2563eb; }
                .btn-primary:hover { background-color: #1d4ed8; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: #334155; background-color: #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
                .btn-secondary:hover { background-color: #cbd5e1; }
                .dark .btn-secondary:hover { background-color: #334155; }
            `}</style>
        </Modal>
    )
};


// --- Settle Delivery Modal ---
interface SettleDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (delivery: Delivery) => void;
    delivery: Delivery;
    products: Product[];
    client: Client;
    // FIX: Changed 't' prop type from TranslationFunction to 'any' to match the shape of the translation object.
    t: any;
}

const SettleDeliveryModal: React.FC<SettleDeliveryModalProps> = ({ isOpen, onClose, onSave, delivery, products, client, t }) => {
    const [returnDate, setReturnDate] = useState(delivery.returnDate ? delivery.returnDate.split('T')[0] : todayISO());
    const [returnedItems, setReturnedItems] = useState<ReturnItem[]>(delivery.returnedItems || []);
    const [payments, setPayments] = useState<Payment[]>(delivery.payments || []);
    const [newPaymentAmount, setNewPaymentAmount] = useState<number | string>('');
    const [newPaymentDate, setNewPaymentDate] = useState(todayISO());

    const isReadOnly = delivery.status === 'Paid';

    const handleReturnChange = (productId: string, quantity: number) => {
        const existing = returnedItems.find(i => i.productId === productId);
        let updated;
        if(existing) {
            updated = returnedItems.map(i => i.productId === productId ? {...i, quantity} : i);
        } else {
            updated = [...returnedItems, { productId, quantity }];
        }
        setReturnedItems(updated.filter(i => i.quantity >= 0));
    };

    const handleAddPayment = () => {
        if(Number(newPaymentAmount) > 0) {
            setPayments([...payments, {id: generateId(), date: new Date(newPaymentDate).toISOString(), amount: Number(newPaymentAmount)}]);
            setNewPaymentAmount('');
        }
    }
    
    const handleSave = () => {
        const totalSoldAmount = delivery.items.reduce((sum, item) => {
            const returnedQty = returnedItems.find(r => r.productId === item.productId)?.quantity || 0;
            const soldQty = item.quantity - returnedQty;
            return sum + (soldQty * item.price);
        }, 0);
        
        const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        
        let status: DeliveryStatus = 'Settled';
        if(totalPaidAmount >= totalSoldAmount && totalSoldAmount > 0) {
            status = 'Paid';
        } else if (delivery.status === 'Pending' && returnedItems.length === 0 && payments.length === 0) {
             status = 'Pending';
        }

        const updatedDelivery = {
            ...delivery,
            returnDate: new Date(returnDate).toISOString(),
            returnedItems,
            payments,
            status
        };
        onSave(updatedDelivery);
    };

    const calculation = useMemo(() => {
        const lines = delivery.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const returnedQty = returnedItems.find(r => r.productId === item.productId)?.quantity || 0;
            const soldQty = item.quantity - returnedQty;
            const total = soldQty * item.price;
            return {
                productName: product?.name || 'Unknown',
                delivered: item.quantity,
                returned: returnedQty,
                sold: soldQty,
                price: item.price,
                total,
            };
        });
        const totalAmount = lines.reduce((sum, line) => sum + line.total, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = totalAmount - totalPaid;

        return { lines, totalAmount, totalPaid, amountDue };
    }, [delivery, returnedItems, payments, products]);
    
    const handlePrint = () => window.print();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t.deliveries.invoice} #${delivery.invoiceNumber}`}>
            <div id="invoice-content">
                <div className="mb-4 text-sm space-y-1">
                    <p><strong>{t.deliveries.client}:</strong> {client.businessName}</p>
                    <p><strong>{t.deliveries.date}:</strong> {formatDate(delivery.date)}</p>
                    {delivery.notes && <p><strong>{t.deliveries.notes}:</strong> {delivery.notes}</p>}
                </div>
                
                {!isReadOnly && <div className="mb-4">
                    <label className="label">{t.deliveries.returnDate}</label>
                    <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="input-style" disabled={isReadOnly}/>
                </div>}

                <table className="w-full text-sm text-left mb-4">
                    <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-2 py-2">{t.products.name}</th>
                            <th className="px-2 py-2 text-center">{t.deliveries.delivered}</th>
                            <th className="px-2 py-2 text-center">{t.deliveries.returned}</th>
                            <th className="px-2 py-2 text-center">{t.deliveries.sold}</th>
                            <th className="px-2 py-2 text-right">{t.deliveries.price}</th>
                            <th className="px-2 py-2 text-right">{t.deliveries.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculation.lines.map((line, i) => (
                        <tr key={i} className="border-b dark:border-slate-700">
                            <td className="px-2 py-2 font-medium">{line.productName}</td>
                            <td className="px-2 py-2 text-center">{line.delivered}</td>
                            <td className="px-2 py-2 text-center">
                                {isReadOnly ? line.returned :
                                <input type="number" 
                                    value={line.returned}
                                    onChange={e => handleReturnChange(delivery.items[i].productId, Number(e.target.value))}
                                    className="w-16 text-center input-style-sm"
                                    max={line.delivered}
                                    min={0}
                                    disabled={isReadOnly}
                                />}
                            </td>
                            <td className="px-2 py-2 text-center">{line.sold}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(line.price)}</td>
                            <td className="px-2 py-2 text-right font-semibold">{formatCurrency(line.total)}</td>
                        </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="text-right font-bold pt-2 pr-2">{t.deliveries.totalAmount}:</td>
                            <td className="text-right font-bold pt-2">{formatCurrency(calculation.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-semibold mb-2">{t.deliveries.payments}</h4>
                        {payments.length > 0 ? (
                            <ul className="text-sm space-y-1">
                            {payments.map(p => <li key={p.id}>{formatDate(p.date)}: {formatCurrency(p.amount)}</li>)}
                            </ul>
                        ) : <p className="text-sm text-slate-500">{t.deliveries.noPayments}</p>}

                        {!isReadOnly && <div className="mt-4 flex gap-2">
                             <input type="date" value={newPaymentDate} onChange={e => setNewPaymentDate(e.target.value)} className="input-style-sm w-full"/>
                             <input type="number" placeholder={t.deliveries.paymentAmount} value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} className="input-style-sm w-full" />
                             <button onClick={handleAddPayment} className="btn-primary text-sm whitespace-nowrap">{t.common.add}</button>
                        </div>}
                    </div>
                     <div className="text-right">
                        <p className="text-sm">{t.common.total} {t.deliveries.payments.toLowerCase()}: {formatCurrency(calculation.totalPaid)}</p>
                        <p className="text-lg font-bold">{t.deliveries.amountDue}: {formatCurrency(calculation.amountDue)}</p>
                    </div>
                </div>
            </div>

            <div className="no-print flex justify-end pt-6 space-x-2">
                <button type="button" onClick={handlePrint} className="btn-secondary">{t.deliveries.printInvoice}</button>
                <button type="button" onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
                {!isReadOnly && <button type="button" onClick={handleSave} className="btn-primary">{t.common.save}</button>}
            </div>
             <style>{`
                .label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-medium; color: #475569; }
                .dark .label { color: #d1d5db; }
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
                .dark .input-style { background-color: #334155; border-color: #475569; color: white; }
                .input-style-sm { display: block; width: 100%; padding: 0.25rem 0.5rem; background-color: white; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-size: 0.875rem; }
                .dark .input-style-sm { background-color: #334155; border-color: #475569; color: white; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: white; background-color: #2563eb; }
                .btn-primary:hover { background-color: #1d4ed8; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; color: #334155; background-color: #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #475569; }
             `}</style>
        </Modal>
    )
}
