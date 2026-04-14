import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, KeyboardAvoidingView, Platform,
    Keyboard, FlatList, Modal, useColorScheme
} from 'react-native';
import {
    Globe, CheckCircle2, Settings2, Server, Activity, Cpu,
    Lock, Search, Hash, Zap, Shield, ShieldAlert, Info, ArrowRight, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import { RefreshControl } from 'react-native';

// --- 1. STABLE SUB-COMPONENTS ---

const CIASlider = memo(({ label, value, onChange, disabled, icon, isDark }) => (
    <View className="mb-5 w-[48%]">
        <View className="flex-row justify-between mb-1.5 px-1">
            <View className="flex-row items-center">
                {icon}
                <Text className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1" numberOfLines={1}>{label}</Text>
            </View>
            <Text className="text-[10px] font-black text-orange-500">{value}</Text>
        </View>
        <View className="flex-row items-center gap-1">
            {[...Array(11).keys()].map(i => (
                <TouchableOpacity
                    key={i}
                    onPress={() => !disabled && onChange(i)}
                    activeOpacity={0.7}
                    className={`h-1.5 flex-1 rounded-full ${i <= value ? (disabled ? 'bg-slate-300 dark:bg-slate-700' : 'bg-orange-500') : 'bg-gray-200 dark:bg-slate-800'}`}
                />
            ))}
        </View>
    </View>
));

const AssetCard = memo(({ asset, isSelected, isExpanded, onSelect, onExpand, loadingServices, services, context, onContextUpdate, isDark }) => {
    const configFields = [
        { key: 'confidentialityWeight', label: 'Confidentiality', icon: <Lock size={10} color="#94a3b8" /> },
        { key: 'integrityWeight', label: 'Integrity', icon: <Activity size={10} color="#94a3b8" /> },
        { key: 'availabilityWeight', label: 'Availability', icon: <Zap size={10} color="#94a3b8" /> },
        { key: 'assetCriticality', label: 'Criticality', icon: <Shield size={10} color="#94a3b8" /> },
        { key: 'slaRequirement', label: 'SLA Priority', icon: <Cpu size={10} color="#94a3b8" /> },
        { key: 'dependentServices', label: 'Dependencies', icon: <Hash size={10} color="#94a3b8" /> },
    ];

    return (
        <View
            className="bg-white dark:bg-[#111827] border-2 rounded-[2.5rem] p-6 mb-6 mx-6"
            style={{ borderColor: isSelected ? '#f97316' : (isDark ? '#1e293b' : '#f1f5f9') }}
        >
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => onSelect(asset._id)}
                        className={`w-8 h-8 rounded-xl border-2 items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-200 dark:border-slate-700'}`}
                    >
                        {isSelected && <CheckCircle2 size={16} color="white" />}
                    </TouchableOpacity>
                    <View className="ml-3 flex-1">
                        <Text className="font-black text-slate-900 dark:text-white text-base leading-tight" numberOfLines={1}>{asset.host}</Text>
                        <Text className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">{asset.ip}</Text>
                    </View>
                </View>
                <View className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    <Text className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">{asset.assetType}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => onExpand(asset._id)} className="bg-gray-50 dark:bg-slate-800/50 py-3 rounded-xl flex-row items-center justify-center mb-4">
                <Server size={14} color="#64748b" />
                <Text className="text-[9px] font-black uppercase text-slate-500 ml-2">{isExpanded ? 'Close Inspection' : 'Inspect Services'}</Text>
            </TouchableOpacity>

            {isExpanded && (
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {loadingServices ? <ActivityIndicator size="small" color="#f97316" /> : services?.map((svc, i) => (
                        <View key={`svc-${i}`} className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                            <Text className="text-[7px] font-black text-orange-600 uppercase">{svc.protocolName}</Text>
                            <Text className="text-[10px] font-black text-slate-800 dark:text-white">:{svc.port}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View className="bg-gray-50 dark:bg-slate-950/50 p-4 rounded-[2rem] border border-gray-100 dark:border-slate-800">
                <View className="flex-row flex-wrap justify-between">
                    {configFields.map((field) => (
                        <CIASlider
                            key={field.key}
                            label={field.label}
                            value={context?.[field.key] ?? 5}
                            onChange={(v) => onContextUpdate(asset._id, field.key, v)}
                            disabled={!isSelected}
                            icon={field.icon}
                            isDark={isDark}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
});

// --- 2. MAIN COMPONENT ---

export default function ScanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    // Core State
    const [step, setStep] = useState(1);
    const [domainInput, setDomainInput] = useState("");
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [scanType, setScanType] = useState("soft");

    // WebSocket & Log State
    const [jobId, setJobId] = useState(null);
    const [logs, setLogs] = useState([]);
    const scrollRef = useRef(null);
    const wsRef = useRef(null);

    // Expansion State
    const [expandedAssetId, setExpandedAssetId] = useState(null);
    const [assetServices, setAssetServices] = useState({});
    const [loadingServices, setLoadingServices] = useState(false);
    const [assetContexts, setAssetContexts] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeepScanModal, setShowDeepScanModal] = useState(false);

    const [refreshing, setRefreshing] = useState(false);

    const onRefreshDiscovery = () => {
        setRefreshing(true);
        // Clear inputs and logs to give the user a "Fresh Start"
        setDomainInput("");
        setLogs([]);
        setJobId(null);
        setRefreshing(false);
    };

    // WebSocket Logic
    const connectWebSocket = (jId, domainId) => {
        if (wsRef.current) wsRef.current.close();
        const ws = new WebSocket(`wss://crypto.mzdev.in/ws/logs?jobId=${jId}`);
        wsRef.current = ws;

        ws.onopen = () => setLogs(["[SYSTEM] Establishing secure link to discovery engine..."]);

        ws.onmessage = (event) => {
            const message = event.data;
            setLogs(prev => [...prev, message]);
            if (message.includes("Discovery Complete") || message.includes("Complete")) {
                setTimeout(() => {
                    fetchAssets(domainId);
                    ws.close();
                }, 1500);
            }
        };
        ws.onerror = () => setLogs(prev => [...prev, "[ERROR] Connection interrupted. Retrying..."]);
    };

    const fetchAssets = async (domainId) => {
        try {
            const res = await API.get(`/asset-discovery/${domainId}/assets`);
            const fetched = res.data.assets || [];
            const initialContexts = {};
            fetched.forEach(a => {
                initialContexts[a._id] = {
                    assetCriticality: 5, confidentialityWeight: 5, integrityWeight: 5,
                    availabilityWeight: 5, slaRequirement: 5, dependentServices: 0
                };
            });
            setAssetContexts(initialContexts);
            setAssets(fetched);
            setStep(2);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDiscover = async () => {
        if (!domainInput) return;
        Keyboard.dismiss();
        setLoading(true);
        setLogs([]);
        try {
            const domainRes = await API.post("/domains", { domainName: domainInput });
            const domainId = domainRes.data._id;
            const discoveryRes = await API.post(`/asset-discovery/${domainId}/discover`);
            setJobId(discoveryRes.data.jobId);
            connectWebSocket(discoveryRes.data.jobId, domainId);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const toggleServices = useCallback(async (assetId) => {
        setExpandedAssetId(prev => prev === assetId ? null : assetId);
        if (!assetServices[assetId]) {
            setLoadingServices(true);
            try {
                const res = await API.get(`/services/${assetId}/services`);
                setAssetServices(prev => ({ ...prev, [assetId]: res.data.services || res.data }));
            } catch (err) { console.error(err); }
            finally { setLoadingServices(false); }
        }
    }, [assetServices]);

    const executeScan = async () => {
        setShowDeepScanModal(false);
        setLoading(true);
        try {
            const payload = {
                domainId: assets[0]?.domainId,
                scanType,
                assets: selectedAssets.map(id => ({
                    assetId: id,
                    businessContext: assetContexts[id]
                })),
                mode: 'per_asset' // Default mode for mobile
            };
            const res = await API.post("/scan", payload);
            router.push({
                pathname: '/results',
                params: { activeScanId: res.data.scanId }
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); setStep(1); }
    };

    const filteredAssets = useMemo(() => assets.filter(a =>
        a.host?.toLowerCase().includes(searchTerm.toLowerCase()) || a.ip?.includes(searchTerm)
    ), [assets, searchTerm]);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View className="flex-1 bg-white dark:bg-[#0b0f19]">
                {step === 1 ? (
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingHorizontal: 24 }}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefreshDiscovery} // Triggers the reset
                                tintColor="#f97316"
                            />
                        }
                    >
                        <View className="items-center mb-10">
                            <Text className="text-orange-500 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Security Operations</Text>
                            <Text className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-center">Scan Engine</Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-center mt-3 font-medium px-4">
                                Initiate deep architectural discovery across cloud, on-premise, and shadow IT endpoints.
                            </Text>
                        </View>

                        <View className="bg-gray-50 dark:bg-[#111827] border-2 border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-2 flex-row items-center mb-8">
                            <Globe size={20} color="#94a3b8" className="ml-4" />
                            <TextInput
                                placeholder="Target Domain or IP"
                                placeholderTextColor="#64748b"
                                value={domainInput}
                                onChangeText={setDomainInput}
                                autoCapitalize="none"
                                className="flex-1 p-4 font-bold text-slate-900 dark:text-white"
                            />
                            <TouchableOpacity
                                onPress={handleDiscover}
                                disabled={loading}
                                className="bg-slate-900 dark:bg-orange-500 px-6 py-4 rounded-[2rem]"
                            >
                                {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-black uppercase text-[10px]">Discover</Text>}
                            </TouchableOpacity>
                        </View>

                        {loading && (
                            <View className="space-y-6">
                                <View className="flex-row justify-between items-center px-2">
                                    <View className="flex-row items-center gap-2">
                                        <Activity size={14} color="#3b82f6" />
                                        <Text className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Discovery Active</Text>
                                    </View>
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Agent: {jobId?.split('-')[0] || 'INIT'}</Text>
                                </View>

                                {/* Terminal UI Mapping */}
                                <View className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                                    <View className="flex-row items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                                        <View className="flex-row gap-1.5">
                                            <View className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                            <View className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                                            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                                        </View>
                                        <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Live Process Stream</Text>
                                    </View>
                                    <View className="h-64 p-6">
                                        <ScrollView
                                            ref={scrollRef}
                                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                        >
                                            {logs.map((log, idx) => (
                                                <View key={idx} className="flex-row mb-1">
                                                    <Text className="text-slate-700 font-mono text-[10px] w-8">{(idx + 1).toString().padStart(3, '0')}</Text>
                                                    <Text className={`font-mono text-[10px] flex-1 ${log.startsWith('[SYSTEM]') ? 'text-blue-400' : log.startsWith('[ERROR]') ? 'text-red-400' : 'text-slate-300'}`}>
                                                        {log}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    {/* Stages Bar */}
                                    <View className="flex-row px-6 py-4 bg-black/20 border-t border-slate-800 justify-between">
                                        {['Passive', 'DNS Brute', 'Port Scan', 'Finalize'].map((s, i) => {
                                            const isActive = logs.some(l => l.includes(s) || (s === 'Finalize' && l.includes('Complete')));
                                            return (
                                                <View key={i} className="items-center flex-1">
                                                    <View className={`h-1 w-full rounded-full mb-2 ${isActive ? 'bg-blue-500' : 'bg-slate-800'}`} />
                                                    <Text className={`text-[7px] font-black uppercase ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>{s}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                ) : (
                    <View className="flex-1">
                        <FlatList
                            data={filteredAssets}
                            keyExtractor={item => item._id}
                            stickyHeaderIndices={[0]}
                            ListHeaderComponent={
                                <View className="bg-white dark:bg-[#0b0f19] px-6 py-6 border-b border-gray-100 dark:border-slate-900">
                                    <View className="bg-slate-900 dark:bg-[#111827] p-5 rounded-[2.5rem] flex-row justify-between items-center shadow-xl mb-6">
                                        <View className="flex-row items-center">
                                            <View className="p-3 rounded-2xl bg-orange-500"><Settings2 size={20} color="white" /></View>
                                            <View className="ml-4">
                                                <Text className="text-slate-400 font-black text-[8px] uppercase tracking-widest">Mode: {scanType}</Text>
                                                <View className="flex-row gap-4 mt-1">
                                                    {['soft', 'deep'].map(t => (
                                                        <TouchableOpacity key={t} onPress={() => setScanType(t)}>
                                                            <Text className={`text-[10px] font-black uppercase ${scanType === t ? 'text-orange-500' : 'text-slate-500'}`}>{t}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => scanType === 'deep' ? setShowDeepScanModal(true) : executeScan()}
                                            disabled={selectedAssets.length === 0}
                                            className={`bg-white px-6 py-3 rounded-2xl ${selectedAssets.length === 0 ? 'opacity-30' : 'opacity-100'}`}
                                        >
                                            <Text className="text-black font-black text-[10px] uppercase">Run Audit</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row items-center bg-gray-50 dark:bg-[#111827] px-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                                        <Search size={16} color="#64748b" />
                                        <TextInput
                                            placeholder="Search nodes..."
                                            placeholderTextColor="#64748b"
                                            value={searchTerm}
                                            onChangeText={setSearchTerm}
                                            className="flex-1 p-4 font-bold text-slate-900 dark:text-white text-sm"
                                        />
                                    </View>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <AssetCard
                                    asset={item}
                                    isDark={isDark}
                                    isSelected={selectedAssets.includes(item._id)}
                                    isExpanded={expandedAssetId === item._id}
                                    onSelect={id => setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
                                    onExpand={toggleServices}
                                    loadingServices={loadingServices}
                                    services={assetServices[item._id]}
                                    context={assetContexts[item._id]}
                                    onContextUpdate={(id, k, v) => setAssetContexts(p => ({ ...p, [id]: { ...p[id], [k]: v } }))}
                                />
                            )}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    </View>
                )}

                {/* Deep Scan Modal Mapping */}
                <Modal visible={showDeepScanModal} transparent animationType="fade">
                    <View className="flex-1 bg-black/60 justify-center items-center p-6">
                        <View className="bg-white dark:bg-[#111827] rounded-[3rem] p-10 w-full shadow-2xl border border-slate-200 dark:border-slate-800 items-center">
                            <View className="p-5 bg-amber-50 dark:bg-amber-500/10 rounded-3xl mb-6">
                                <ShieldAlert size={48} color="#f59e0b" />
                            </View>
                            <Text className="text-2xl font-black dark:text-white uppercase italic mb-4">Confirm Deep Scan</Text>
                            <Text className="text-slate-600 dark:text-slate-400 font-bold text-center mb-8 leading-5">
                                Intensive architectural discovery and cryptographic analysis.
                                {"\n"}<Text className="text-amber-600 font-black text-[10px] uppercase">Takes approximately 4-5 minutes.</Text>
                            </Text>
                            <View className="flex-row gap-4">
                                <TouchableOpacity onPress={() => setShowDeepScanModal(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 py-4 rounded-2xl items-center">
                                    <Text className="font-black uppercase text-[10px] text-slate-600">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={executeScan} className="flex-1 bg-slate-900 dark:bg-orange-500 py-4 rounded-2xl items-center shadow-lg">
                                    <Text className="font-black uppercase text-[10px] text-white">Continue</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
}