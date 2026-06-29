import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';

interface FinancialStats {
  income: number;
  expenses: number;
  balance: number;
}

export const FinancialHeaderStats: React.FC = () => {
  const [stats, setStats] = useState<FinancialStats>({ income: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('financial_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions' }, () => {
        fetchFinancialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFinancialData = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('type, amount');

      if (error) throw error;

      if (data) {
        const income = data
          .filter(t => t.type === 'income')
          .reduce((acc, t) => acc + Number(t.amount), 0);
        
        const expenses = data
          .filter(t => t.type === 'expense')
          .reduce((acc, t) => acc + Number(t.amount), 0);

        setStats({
          income,
          expenses,
          balance: income - expenses
        });
      }
    } catch (error) {
      console.error('Error fetching financial stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-exec-border/50 rounded-md"></div>
        ))}
      </div>
    );
  }

  const StatItem = ({ label, value, icon: Icon, colorClass, bgColorClass }: any) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border border-exec-border ${bgColorClass} transition-all hover:scale-105 duration-300`}>
      <div className={`p-1 rounded-sm ${colorClass} bg-opacity-10`}>
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter leading-none mb-0.5">{label}</span>
        <span className="text-xs font-semibold text-white leading-none">
          S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatItem 
        label="Ingresos" 
        value={stats.income} 
        icon={TrendingUp} 
        colorClass="text-green-500" 
        bgColorClass="bg-green-500/5"
      />
      <StatItem 
        label="Egresos" 
        value={stats.expenses} 
        icon={TrendingDown} 
        colorClass="text-red-500" 
        bgColorClass="bg-red-500/5"
      />
      <StatItem 
        label="Saldo" 
        value={stats.balance} 
        icon={Wallet} 
        colorClass="text-exec-blue" 
        bgColorClass="bg-exec-blue/5"
      />
    </div>
  );
};
