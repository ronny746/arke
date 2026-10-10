"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Loader2,
  Layers,
  BookOpen,
  User,
  Plus,
  Calendar,
  AlertCircle,
  Send,
  DollarSign,
  Check,
  FileText,
  ChevronRight,
  X,
  Divide,
  BellRing,
  Wallet,
  Receipt,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '@/api/admin.js';

export default function AdminFeesPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'transactions'>('plans');

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [searchTxnQuery, setSearchTxnQuery] = useState('');
  const [statusTxnFilter, setStatusTxnFilter] = useState('ALL');

  // Custom Installment Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [searchPlanQuery, setSearchPlanQuery] = useState('');
  const [statusPlanFilter, setStatusPlanFilter] = useState('ALL');

  // Modals State
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [selectedPlanForOffline, setSelectedPlanForOffline] = useState<any>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlanForView, setSelectedPlanForView] = useState<any>(null);

  const [scanningReminders, setScanningReminders] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchTransactions();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await adminAPI.getCustomFeePlans();
      if (res?.data?.success) {
        setPlans(res.data.data || []);
      }
    } catch (err: any) {
      console.warn("getCustomFeePlans error:", err);
      toast.error('Failed to load installment plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTxns(true);
      let res;
      try {
        res = await adminAPI.getTransactions();
      } catch (err: any) {
        console.warn("getTransactions API call failed, falling back to getFeeRecords", err);
        res = await adminAPI.getFeeRecords();
      }

      if (res?.data?.success) {
        const rawData = res.data.data || [];
        const normalized = rawData.map((item: any) => ({
          _id: item._id,
          studentId: item.studentId,
          courseId: item.courseId,
          batchId: item.batchId,
          courseName: item.courseName || item.courseId?.name || 'General Course',
          batchName: item.batchName || (item.batchId ? `${item.batchId.name}${item.batchId.section ? ' (Sec ' + item.batchId.section + ')' : ''}` : 'Enrolled Batch'),
          amountPaid: item.amountPaid ?? item.amountDue ?? 0,
          transactionId: item.transactionId || `REC_${item._id?.slice(-8).toUpperCase()}`,
          paymentMethod: item.paymentMethod || 'ONLINE',
          createdAt: item.createdAt || item.dueDate,
          status: item.status === 'PAID' ? 'SUCCESS' : (item.status || 'SUCCESS'),
          installmentNumber: item.installmentNumber
        }));
        setTransactions(normalized);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transaction records');
    } finally {
      setLoadingTxns(false);
    }
  };

  const handleScanReminders = async () => {
    setScanningReminders(true);
    try {
      const res = await adminAPI.checkDuePaymentReminders();
      const count = res?.data?.data?.remindersSent ?? 0;
      toast.success(`Due payment scan complete: ${count} reminder(s) dispatched to students & parents.`);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error checking payment reminders');
    } finally {
      setScanningReminders(false);
    }
  };

  const handleSendSingleReminder = async (plan: any, instNum?: number) => {
    try {
      const res = await adminAPI.sendPaymentReminder({
        feeRecordId: plan._id,
        installmentNumber: instNum
      });
      toast.success(res?.data?.message || 'Reminder sent successfully!');
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send reminder');
    }
  };

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const query = searchPlanQuery.trim().toLowerCase();
      const sName = `${plan.studentId?.firstName || ''} ${plan.studentId?.lastName || ''}`.toLowerCase();
      const sEmail = (plan.studentId?.email || '').toLowerCase();
      const sPhone = (plan.studentId?.phone || '').toLowerCase();
      const sRoll = (plan.studentId?.metadata?.rollNo || '').toLowerCase();
      const cName = (plan.courseId?.name || '').toLowerCase();
      const bName = `${plan.batchId?.name || ''} ${plan.batchId?.section || ''}`.toLowerCase();

      const matchesSearch =
        !query ||
        sName.includes(query) ||
        sEmail.includes(query) ||
        sPhone.includes(query) ||
        sRoll.includes(query) ||
        cName.includes(query) ||
        bName.includes(query);

      const matchesStatus =
        statusPlanFilter === 'ALL' ||
        plan.status?.toUpperCase() === statusPlanFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchPlanQuery, statusPlanFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const query = searchTxnQuery.trim().toLowerCase();
      const studentName = `${txn.studentId?.firstName || ''} ${txn.studentId?.lastName || ''} ${txn.studentName || ''}`.toLowerCase();
      const email = (txn.studentId?.email || '').toLowerCase();
      const phone = (txn.studentId?.phone || txn.phone || '').toLowerCase();
      const batch = `${txn.batchName || ''} ${txn.batchId?.name || ''} ${txn.batchId?.section || ''}`.toLowerCase();
      const course = `${txn.courseName || ''} ${txn.courseId?.name || ''}`.toLowerCase();
      const txnId = (txn.transactionId || txn._id || '').toLowerCase();
      const method = (txn.paymentMethod || '').toLowerCase();
      const rollNo = String(txn.studentId?.metadata?.rollNo || txn.rollNo || '').toLowerCase();

      const matchesSearch =
        !query ||
        studentName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        batch.includes(query) ||
        course.includes(query) ||
        txnId.includes(query) ||
        method.includes(query) ||
        rollNo.includes(query);

      const matchesStatus =
        statusTxnFilter === 'ALL' ||
        txn.status?.toUpperCase() === statusTxnFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTxnQuery, statusTxnFilter]);

  // Aggregate Metrics
  const totalRevenue = transactions
    .filter((t) => t.status === 'SUCCESS' || t.status === 'PAID')
    .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

  const planStats = useMemo(() => {
    const totalCommitted = plans.reduce((sum, p) => sum + (Number(p.totalCoursePrice || p.amountDue + p.amountPaid) || 0), 0);
    const totalCollected = plans.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalOutstanding = plans.reduce((sum, p) => sum + (Number(p.amountDue) || 0), 0);
    const overdueCount = plans.reduce((acc, p) => {
      const hasOverdue = (p.installments || []).some((i: any) => i.status !== 'PAID' && i.dueDate && new Date(i.dueDate) < new Date());
      return acc + (hasOverdue ? 1 : 0);
    }, 0);

    return { totalCommitted, totalCollected, totalOutstanding, overdueCount };
  }, [plans]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase">
              Financial Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
            Student Fees & Partial Installments
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Configure custom student course prices, manual installment schedules, record offline payments, and automate due reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'plans') fetchPlans();
              else fetchTransactions();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-xs shadow-sm transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={(loadingPlans || loadingTxns) ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleScanReminders}
            disabled={scanningReminders}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
            title="Scan upcoming installments and notify students & parents"
          >
            <BellRing size={15} className={scanningReminders ? "animate-bounce" : ""} />
            {scanningReminders ? 'Scanning...' : 'Scan Due Reminders'}
          </button>

          <button
            onClick={() => {
              setEditingPlan(null);
              setShowConfigureModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus size={16} />
            Configure Student Plan
          </button>
        </div>
      </header>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Installment Plans</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{plans.length}</p>
          <span className="text-xs text-gray-500 font-medium">Students on custom schedules</span>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Committed Fees</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">₹{planStats.totalCommitted.toLocaleString()}</p>
          <span className="text-xs text-gray-500 font-medium">Agreed course revenue</span>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Collected (Paid)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">₹{planStats.totalCollected.toLocaleString()}</p>
          <span className="text-xs text-emerald-600 font-semibold">
            {planStats.totalCommitted > 0 ? `${Math.round((planStats.totalCollected / planStats.totalCommitted) * 100)}% collected` : '0%'}
          </span>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outstanding Balance Due</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">₹{planStats.totalOutstanding.toLocaleString()}</p>
          <span className="text-xs text-rose-500 font-bold">
            {planStats.overdueCount > 0 ? `${planStats.overdueCount} student(s) overdue` : 'No overdue accounts'}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'plans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers size={17} />
          Student Installment Plans
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'plans' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {plans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt size={17} />
          All Transactions & Receipts
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'transactions' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {transactions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INSTALLMENT PLANS */}
      {activeTab === 'plans' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden space-y-4">
          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by student name, roll no, phone, course..."
                value={searchPlanQuery}
                onChange={(e) => setSearchPlanQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'PENDING', 'PARTIAL', 'PAID'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusPlanFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusPlanFilter === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Table */}
          <div className="overflow-x-auto">
            {loadingPlans ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Layers size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-base text-gray-700">No custom installment plans configured</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
                  Click "Configure Student Plan" to set a custom course price and manual installment schedule for any student.
                </p>
                <button
                  onClick={() => setShowConfigureModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-all"
                >
                  + Add First Installment Plan
                </button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Course & Batch</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Price & Paid</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Installments Schedule</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {filteredPlans.map((plan) => {
                    const totalInstallments = plan.installments?.length || 0;
                    const paidInstallments = (plan.installments || []).filter((i: any) => i.status === 'PAID').length;
                    const nextPending = (plan.installments || []).find((i: any) => i.status !== 'PAID');
                    const isNextOverdue = nextPending?.dueDate && new Date(nextPending.dueDate) < new Date();

                    return (
                      <tr key={plan._id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Student */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                              {plan.studentId?.firstName?.[0] || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">
                                {plan.studentId?.firstName ? `${plan.studentId.firstName} ${plan.studentId.lastName || ''}` : 'Student'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {plan.studentId?.phone || plan.studentId?.email || 'N/A'}
                              </div>
                              {plan.studentId?.metadata?.rollNo && (
                                <span className="inline-block mt-0.5 text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  Roll #{plan.studentId.metadata.rollNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Course & Batch */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">
                            {plan.courseId?.name || 'Course'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {plan.batchId?.name ? `${plan.batchId.name}${plan.batchId.section ? ' (Sec ' + plan.batchId.section + ')' : ''}` : 'Default Batch'}
                          </div>
                        </td>

                        {/* Price & Paid */}
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 text-base">
                            ₹{(plan.totalCoursePrice || (plan.amountPaid + plan.amountDue)).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Paid: <span className="font-bold text-emerald-600">₹{plan.amountPaid.toLocaleString()}</span> | Due: <span className="font-bold text-amber-600">₹{plan.amountDue.toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Installments Schedule Progress */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-700">
                              {paidInstallments} of {totalInstallments} Paid
                            </span>
                            <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{
                                  width: totalInstallments > 0 ? `${(paidInstallments / totalInstallments) * 100}%` : '0%'
                                }}
                              />
                            </div>
                          </div>
                          {nextPending && (
                            <div className={`text-xs mt-1 font-semibold flex items-center gap-1 ${isNextOverdue ? 'text-rose-600' : 'text-gray-500'}`}>
                              <Clock size={12} />
                              Inst #{nextPending.installmentNumber} (₹{nextPending.amount.toLocaleString()}) {isNextOverdue ? 'Overdue' : 'due'} {new Date(nextPending.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            plan.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : plan.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {plan.status === 'PAID' && <CheckCircle2 size={12} />}
                            {plan.status === 'PARTIAL' && <Clock size={12} />}
                            {plan.status === 'PENDING' && <AlertCircle size={12} />}
                            {plan.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPlanForView(plan);
                                setShowViewModal(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                              title="View all installments breakdown"
                            >
                              Timeline
                            </button>

                            {plan.status !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setSelectedPlanForOffline(plan);
                                  setShowOfflineModal(true);
                                }}
                                className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                                title="Record offline Cash, Cheque, or UPI payment"
                              >
                                Record Offline
                              </button>
                            )}

                            {plan.status !== 'PAID' && (
                              <button
                                onClick={() => handleSendSingleReminder(plan)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Send push & in-app reminder to student & parent"
                              >
                                <BellRing size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingPlan(plan);
                                setShowConfigureModal(true);
                              }}
                              className="px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit custom fee plan"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS & REVENUE */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden space-y-4">
          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by student, batch, course, transaction ID..."
                value={searchTxnQuery}
                onChange={(e) => setSearchTxnQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusTxnFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusTxnFilter === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            {loadingTxns ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CreditCard size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-base text-gray-700">No transaction records found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting search or status filters.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Course & Batch</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount Paid</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Transaction Info</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {filteredTransactions.map((txn, idx) => (
                    <tr key={txn._id || idx} className="hover:bg-gray-50/50 transition-colors">
                      {/* Student */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {txn.studentId?.firstName?.[0] || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">
                              {txn.studentId?.firstName ? `${txn.studentId.firstName} ${txn.studentId.lastName || ''}` : 'Student'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {txn.studentId?.email || txn.studentId?.phone || 'N/A'}
                            </div>
                            {txn.studentId?.metadata?.rollNo && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {txn.studentId.metadata.rollNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Enrolled Batch & Course */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{txn.courseName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{txn.batchName}</div>
                      </td>

                      {/* Price / Amount */}
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900 text-base">
                          ₹{Number(txn.amountPaid || 0).toLocaleString()}
                        </div>
                        {txn.installmentNumber && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Installment #{txn.installmentNumber}
                          </span>
                        )}
                      </td>

                      {/* Transaction Info */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold text-gray-800">
                          {txn.transactionId}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {txn.paymentMethod}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          txn.status === 'SUCCESS' || txn.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : txn.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {txn.status === 'SUCCESS' || txn.status === 'PAID' ? <CheckCircle2 size={12} /> : null}
                          {txn.status === 'PENDING' ? <Clock size={12} /> : null}
                          {txn.status === 'FAILED' ? <XCircle size={12} /> : null}
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: CONFIGURE CUSTOM INSTALLMENT PLAN ── */}
      {showConfigureModal && (
        <ConfigurePlanModal
          plan={editingPlan}
          onClose={() => {
            setShowConfigureModal(false);
            setEditingPlan(null);
          }}
          onSuccess={() => {
            setShowConfigureModal(false);
            setEditingPlan(null);
            fetchPlans();
          }}
        />
      )}

      {/* ── MODAL 2: RECORD OFFLINE PAYMENT ── */}
      {showOfflineModal && selectedPlanForOffline && (
        <RecordOfflineModal
          plan={selectedPlanForOffline}
          onClose={() => {
            setShowOfflineModal(false);
            setSelectedPlanForOffline(null);
          }}
          onSuccess={() => {
            setShowOfflineModal(false);
            setSelectedPlanForOffline(null);
            fetchPlans();
            fetchTransactions();
          }}
        />
      )}

      {/* ── MODAL 3: VIEW INSTALLMENTS BREAKDOWN ── */}
      {showViewModal && selectedPlanForView && (
        <ViewInstallmentsModal
          plan={selectedPlanForView}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPlanForView(null);
          }}
          onRecordOffline={(plan) => {
            setShowViewModal(false);
            setSelectedPlanForOffline(plan);
            setShowOfflineModal(true);
          }}
          onSendReminder={(plan, instNum) => {
            handleSendSingleReminder(plan, instNum);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONFIGURE CUSTOM PLAN MODAL
// ─────────────────────────────────────────────────────────────
function ConfigurePlanModal({ plan, onClose, onSuccess }: { plan?: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const [studentId, setStudentId] = useState(plan?.studentId?._id || plan?.studentId || '');
  const [courseId, setCourseId] = useState(plan?.courseId?._id || plan?.courseId || '');
  const [totalCoursePrice, setTotalCoursePrice] = useState<number>(
    plan?.totalCoursePrice || (plan?.amountPaid + plan?.amountDue) || 0
  );
  const [notes, setNotes] = useState(plan?.notes || '');

  // Installments state
  const [installments, setInstallments] = useState<Array<{
    installmentNumber: number;
    title: string;
    amount: number;
    dueDate: string;
    remarks: string;
    status?: string;
  }>>(
    plan?.installments?.length
      ? plan.installments.map((i: any) => ({
          installmentNumber: i.installmentNumber,
          title: i.title || `Installment #${i.installmentNumber}`,
          amount: i.amount,
          dueDate: i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : '',
          remarks: i.remarks || '',
          status: i.status
        }))
      : [
          {
            installmentNumber: 1,
            title: '1st Installment (Admission)',
            amount: 0,
            dueDate: new Date().toISOString().split('T')[0],
            remarks: ''
          },
          {
            installmentNumber: 2,
            title: '2nd Installment',
            amount: 0,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            remarks: ''
          }
        ]
  );

  useEffect(() => {
    // Fetch courses
    setLoadingCourses(true);
    adminAPI.getCourses()
      .then(res => {
        const list = res?.data?.data || res?.data || [];
        setCourses(Array.isArray(list) ? list : (list.courses || []));
      })
      .catch((err) => {
        console.error('Failed to load courses', err);
      })
      .finally(() => {
        setLoadingCourses(false);
      });

    // Fetch students using adminAPI to ensure auth headers, tenant scope and developer mode
    setLoadingStudents(true);
    adminAPI.getUsers({ role: 'student' })
      .then(res => {
        const data = res?.data?.data || res?.data;
        const list = Array.isArray(data) ? data : (data?.users || []);
        setStudents(list);
      })
      .catch((err) => {
        console.error('Failed to load students', err);
        toast.error('Failed to load students list');
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, []);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter(s => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const email = (s.email || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const rollNo = (s.metadata?.rollNo || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || rollNo.includes(q);
    });
  }, [students, studentSearch]);

  // When course changes, pre-fill base fee if not set
  const handleCourseChange = (cId: string) => {
    setCourseId(cId);
    const selectedCourse = courses.find(c => String(c._id) === String(cId));
    if (selectedCourse && (!totalCoursePrice || totalCoursePrice === 0)) {
      const defaultFee = Number(selectedCourse.fee) || 0;
      setTotalCoursePrice(defaultFee);
      // Auto-divide across installments
      splitEvenly(defaultFee, installments.length);
    }
  };

  const splitEvenly = (priceVal: number, count: number) => {
    if (count <= 0) return;
    const base = Math.floor(priceVal / count);
    const remainder = priceVal - (base * count);

    const updated = installments.slice(0, count).map((inst, idx) => ({
      ...inst,
      installmentNumber: idx + 1,
      title: inst.title || `Installment #${idx + 1}`,
      amount: idx === 0 ? base + remainder : base
    }));

    // If count > installments.length, generate extra rows
    while (updated.length < count) {
      const nextNum = updated.length + 1;
      const nextDate = new Date(Date.now() + nextNum * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      updated.push({
        installmentNumber: nextNum,
        title: `Installment #${nextNum}`,
        amount: base,
        dueDate: nextDate,
        remarks: ''
      });
    }

    setInstallments(updated);
  };

  const handleInstallmentCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(12, newCount));
    if (validCount === installments.length) return;

    if (validCount > installments.length) {
      const toAdd = validCount - installments.length;
      const newRows = [...installments];
      for (let i = 0; i < toAdd; i++) {
        const nextNum = newRows.length + 1;
        const nextDate = new Date(Date.now() + nextNum * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        newRows.push({
          installmentNumber: nextNum,
          title: `Installment #${nextNum}`,
          amount: 0,
          dueDate: nextDate,
          remarks: ''
        });
      }
      setInstallments(newRows);
      if (totalCoursePrice > 0) splitEvenly(totalCoursePrice, validCount);
    } else {
      const sliced = installments.slice(0, validCount);
      setInstallments(sliced);
      if (totalCoursePrice > 0) splitEvenly(totalCoursePrice, validCount);
    }
  };

  const installmentsSum = useMemo(() => {
    return installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [installments]);

  const priceDifference = totalCoursePrice - installmentsSum;
  const isSumMatching = Math.abs(priceDifference) === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error('Please select a student');
      return;
    }
    if (!courseId) {
      toast.error('Please select a course');
      return;
    }
    if (totalCoursePrice <= 0) {
      toast.error('Total course price must be greater than 0');
      return;
    }
    if (!isSumMatching) {
      toast.error(`Installment amounts total (₹${installmentsSum.toLocaleString()}) does not match agreed price (₹${totalCoursePrice.toLocaleString()})`);
      return;
    }

    // Check due dates
    for (const inst of installments) {
      if (!inst.dueDate) {
        toast.error(`Please provide a due date for Installment #${inst.installmentNumber}`);
        return;
      }
      if (inst.amount <= 0) {
        toast.error(`Installment #${inst.installmentNumber} amount must be greater than zero`);
        return;
      }
    }

    setLoading(true);
    try {
      await adminAPI.createOrUpdateCustomFeePlan({
        studentId,
        courseId,
        totalCoursePrice,
        installments,
        notes
      });
      toast.success('Custom fee installment plan saved successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save fee plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/30">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {plan ? 'Edit Student Installment Plan' : 'Configure Custom Student Fee & Installments'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set custom price and manual installment schedule for any individual student.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student & Course Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Target Student * {loadingStudents ? '(Loading...)' : `(${students.length} found)`}
                </label>
              </div>

              {!plan && students.length > 5 && (
                <div className="mb-2 relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student by name, roll, phone..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500"
                  />
                </div>
              )}

              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={Boolean(plan) || loadingStudents}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingStudents
                    ? '-- Loading students... --'
                    : students.length === 0
                    ? '-- No students found --'
                    : '-- Select Student --'}
                </option>
                {/* Fallback for pre-selected student in edit mode */}
                {plan && !filteredStudents.some(s => String(s._id || s.id) === String(studentId)) && (
                  <option value={studentId}>
                    {plan?.studentId?.firstName ? `${plan.studentId.firstName} ${plan.studentId.lastName || ''}` : 'Selected Student'}
                  </option>
                )}
                {filteredStudents.map((s) => {
                  const sId = s._id || s.id;
                  const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
                  const roll = s.metadata?.rollNo ? ` (#${s.metadata.rollNo})` : '';
                  const contact = s.phone ? ` • ${s.phone}` : s.email ? ` • ${s.email}` : '';
                  return (
                    <option key={sId} value={sId}>
                      {fullName}{roll}{contact}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Target Course * {loadingCourses ? '(Loading...)' : `(${courses.length} available)`}
                </label>
              </div>
              <select
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={Boolean(plan) || loadingCourses}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingCourses
                    ? '-- Loading courses... --'
                    : courses.length === 0
                    ? '-- No courses found --'
                    : '-- Select Course --'}
                </option>
                {courses.map((c) => {
                  const cId = c._id || c.id;
                  return (
                    <option key={cId} value={cId}>
                      {c.name || c.title || 'Course'} {c.fee ? `(Base Fee: ₹${Number(c.fee).toLocaleString()})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Agreed Price & Installment Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Agreed Course Price for Student (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  value={totalCoursePrice || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setTotalCoursePrice(val);
                  }}
                  placeholder="e.g. 45000"
                  required
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Overrides default course catalog fee for this student.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Number of Installments
                </label>
                <button
                  type="button"
                  onClick={() => splitEvenly(totalCoursePrice, installments.length)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Divide size={12} /> Auto-Split Evenly
                </button>
              </div>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleInstallmentCountChange(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      installments.length === num
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Manual partial installments breakdown below.</p>
            </div>
          </div>

          {/* Installment Breakdown Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Installment Breakdown Schedule ({installments.length} Parts)
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  isSumMatching
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                }`}>
                  Sum: ₹{installmentsSum.toLocaleString()} / ₹{totalCoursePrice.toLocaleString()}
                  {!isSumMatching && ` (${priceDifference > 0 ? `₹${priceDifference.toLocaleString()} short` : `₹${Math.abs(priceDifference).toLocaleString()} over`})`}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {installments.map((inst, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center gap-3 ${
                    inst.status === 'PAID'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-black shrink-0">
                    #{inst.installmentNumber}
                  </div>

                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      value={inst.title}
                      onChange={(e) => {
                        const copy = [...installments];
                        copy[idx].title = e.target.value;
                        setInstallments(copy);
                      }}
                      placeholder={`Installment #${inst.installmentNumber}`}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={inst.amount || ''}
                        disabled={inst.status === 'PAID'}
                        onChange={(e) => {
                          const copy = [...installments];
                          copy[idx].amount = Number(e.target.value) || 0;
                          setInstallments(copy);
                        }}
                        placeholder="Amount"
                        required
                        className="w-full pl-6 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-40">
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => {
                        const copy = [...installments];
                        copy[idx].dueDate = e.target.value;
                        setInstallments(copy);
                      }}
                      required
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                    />
                  </div>

                  {inst.status === 'PAID' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      PAID
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Internal Admin Remarks (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Concession granted by Director on 10 Oct; 3 monthly installments approved."
              rows={2}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:border-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isSumMatching}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {plan ? 'Update Fee Plan' : 'Save & Assign Installment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RECORD OFFLINE PAYMENT MODAL
// ─────────────────────────────────────────────────────────────
function RecordOfflineModal({ plan, onClose, onSuccess }: { plan: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const pendingInstallments = (plan?.installments || []).filter((i: any) => i.status !== 'PAID');

  const [installmentNumber, setInstallmentNumber] = useState<number>(
    pendingInstallments[0]?.installmentNumber || 1
  );

  const selectedInst = (plan?.installments || []).find((i: any) => i.installmentNumber === installmentNumber);

  const [amountPaid, setAmountPaid] = useState<number>(selectedInst?.amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD'>('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const handleInstallmentSelect = (num: number) => {
    setInstallmentNumber(num);
    const inst = (plan?.installments || []).find((i: any) => i.installmentNumber === num);
    if (inst) {
      setAmountPaid(inst.amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      toast.error('Amount paid must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.recordOfflinePayment({
        feeRecordId: plan._id,
        installmentNumber,
        amountPaid,
        paymentMethod,
        transactionId,
        paidAt,
        remarks
      });
      toast.success(`Offline payment for Installment #${installmentNumber} recorded!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to record offline payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-emerald-600" />
              Record Offline Installment Payment
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Acknowledge offline payment (Cash, Cheque, UPI, NEFT) for {plan.studentId?.firstName || 'Student'}.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-900">
                {plan.studentId?.firstName} {plan.studentId?.lastName || ''}
              </div>
              <div className="text-[11px] text-gray-500">{plan.courseId?.name || 'Course'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-gray-900">
                Total Due: ₹{plan.amountDue.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">
                Paid So Far: ₹{plan.amountPaid.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Select Installment to pay */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Select Installment to Settle *
            </label>
            <select
              value={installmentNumber}
              onChange={(e) => handleInstallmentSelect(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:border-emerald-600"
            >
              {pendingInstallments.map((inst: any) => (
                <option key={inst.installmentNumber} value={inst.installmentNumber}>
                  Installment #{inst.installmentNumber}: ₹{inst.amount.toLocaleString()} (Due: {new Date(inst.dueDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Paid & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Amount Paid (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  required
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-gray-900 focus:bg-white focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Payment Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-emerald-600"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">Direct UPI / QR</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="CARD">Card POS Terminal</option>
              </select>
            </div>
          </div>

          {/* Receipt / Ref No & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Receipt / Cheque / UTR Ref
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. REC-2026-8941"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Remarks / Acknowledgment Note
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paid in cash at reception desk"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:border-emerald-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Confirm & Issue Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VIEW INSTALLMENTS TIMELINE MODAL
// ─────────────────────────────────────────────────────────────
function ViewInstallmentsModal({
  plan,
  onClose,
  onRecordOffline,
  onSendReminder
}: {
  plan: any;
  onClose: () => void;
  onRecordOffline: (plan: any) => void;
  onSendReminder: (plan: any, instNum: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Installment Schedule Timeline
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.studentId?.firstName} {plan.studentId?.lastName || ''} — {plan.courseId?.name || 'Course'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Plan</span>
              <p className="text-base font-black text-gray-900 mt-0.5">
                ₹{(plan.totalCoursePrice || plan.amountDue + plan.amountPaid).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Paid So Far</span>
              <p className="text-base font-black text-emerald-600 mt-0.5">
                ₹{plan.amountPaid.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase">Remaining Due</span>
              <p className="text-base font-black text-amber-600 mt-0.5">
                ₹{plan.amountDue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Timeline of Installments */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              Installments Breakdown ({plan.installments?.length || 0})
            </h4>

            <div className="space-y-2.5">
              {(plan.installments || []).map((inst: any) => {
                const isPaid = inst.status === 'PAID';
                const isOverdue = !isPaid && inst.dueDate && new Date(inst.dueDate) < new Date();

                return (
                  <div
                    key={inst.installmentNumber}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isPaid
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isOverdue
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isPaid ? 'bg-emerald-600 text-white' : isOverdue ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-800'
                      }`}>
                        #{inst.installmentNumber}
                      </div>

                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {inst.title || `Installment #${inst.installmentNumber}`}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Due: <strong className="text-gray-700">{new Date(inst.dueDate).toLocaleDateString()}</strong></span>
                          {inst.paidAt && (
                            <span>• Paid on {new Date(inst.paidAt).toLocaleDateString()}</span>
                          )}
                          {inst.paymentMethod && (
                            <span className="uppercase text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                              {inst.paymentMethod}
                            </span>
                          )}
                        </div>
                        {inst.transactionId && (
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                            Ref: {inst.transactionId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-sm font-black text-gray-900">
                          ₹{inst.amount.toLocaleString()}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                      </div>

                      {!isPaid && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSendReminder(plan, inst.installmentNumber)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                            title="Send push reminder"
                          >
                            <BellRing size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => onRecordOffline(plan)}
            disabled={plan.status === 'PAID'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Receipt size={14} />
            Record Offline Payment
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
