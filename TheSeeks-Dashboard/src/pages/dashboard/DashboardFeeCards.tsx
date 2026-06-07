import React from 'react';

export interface FeeCard {
    label: string;
    value: string;
    sub: string;
    accent: string;
}

interface DashboardFeeCardsProps {
    feeCards: FeeCard[];
    filter: 'Weekly' | 'Monthly' | 'Yearly';
    setFilter: (f: 'Weekly' | 'Monthly' | 'Yearly') => void;
}

export default function DashboardFeeCards({ feeCards, filter, setFilter }: DashboardFeeCardsProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>Fee Overview</h3>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => setFilter('Weekly')} 
                        style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, background: filter === 'Weekly' ? 'var(--primary)' : 'transparent', color: filter === 'Weekly' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer' }}
                    >Weekly</button>
                    <button 
                        onClick={() => setFilter('Monthly')} 
                        style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, background: filter === 'Monthly' ? 'var(--primary)' : 'transparent', color: filter === 'Monthly' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer' }}
                    >Monthly</button>
                    <button 
                        onClick={() => setFilter('Yearly')} 
                        style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, background: filter === 'Yearly' ? 'var(--primary)' : 'transparent', color: filter === 'Yearly' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer' }}
                    >Yearly</button>
                </div>
            </div>
            <div className="dash-fee-grid dash-animate" style={{ animationDelay: '0.15s' }}>
                {feeCards.map((c, i) => (
                    <div key={i} className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ height: 2, background: c.accent }} />
                        <div style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{c.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{c.value}</div>
                            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{c.sub}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
