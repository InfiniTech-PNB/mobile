import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard, FlatList, ScrollView
} from 'react-native';
import {
    Globe, CheckCircle2, Settings2, Server, Activity, Cpu,
    Lock, Search, ChevronDown, ChevronUp, Hash, Zap, Shield, Loader2, Loader
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import { useColorScheme } from 'react-native';

// --- 1. STABLE SUB-COMPONENTS (Defined outside to prevent re-render crashes) ---

const CIASlider = memo(({ label, value, onChange, disabled, icon }) => (
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
                    className={`h-1.5 flex-1 rounded-full ${i <= value ? (disabled ? 'bg-slate-300' : 'bg-orange-500') : 'bg-gray-200 dark:bg-slate-800'}`}
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
            className="bg-white dark:bg-[#111827] border-2 rounded-[2.5rem] p-5 mb-6 mx-6"
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
                <Text className="text-[9px] font-black uppercase text-slate-500 ml-2">{isExpanded ? 'Hide Services' : 'Inspect Services'}</Text>
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
                        />
                    ))}
                </View>
            </View>
        </View>
    );
});

// Move this OUTSIDE and use memo to prevent unnecessary re-renders
const ListHeader = memo(({ searchTerm, setSearchTerm, scanType, setScanType, onStartScan, selectedCount }) => (
    <View className="bg-white dark:bg-[#0b0f19] px-6 py-4 border-b border-gray-100 dark:border-slate-900">
        <View className="bg-slate-900 dark:bg-[#111827] p-5 rounded-[2rem] flex-row justify-between items-center shadow-md mb-4">
            <View className="flex-row items-center">
                <View className="p-2 rounded-xl bg-orange-500">
                    <Settings2 size={18} color="white" />
                </View>
                <View className="ml-3">
                    <Text className="text-white font-black text-[10px] uppercase">Engine</Text>
                    <View className="flex-row gap-4 mt-1">
                        {['soft', 'deep'].map(type => (
                            <TouchableOpacity key={type} onPress={() => setScanType(type)}>
                                <Text className={`text-[8px] font-black uppercase ${scanType === type ? 'text-orange-500' : 'text-slate-500'}`}>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
            <TouchableOpacity
                onPress={onStartScan}
                disabled={selectedCount === 0}
                className={`bg-white px-6 py-3 rounded-2xl ${selectedCount === 0 ? 'opacity-30' : 'opacity-100'}`}
            >
                <Text className="text-black font-black text-[10px] uppercase">Run Audit</Text>
            </TouchableOpacity>
        </View>
        <TextInput
            placeholder="Search assets..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white font-bold"
        />
    </View>
));

// --- 2. MAIN COMPONENT ---

export default function ScanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    const [step, setStep] = useState(1);
    const [domainInput, setDomainInput] = useState("");
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [scanType, setScanType] = useState("soft");
    const [expandedAssetId, setExpandedAssetId] = useState(null);
    const [assetServices, setAssetServices] = useState({});
    const [loadingServices, setLoadingServices] = useState(false);
    const [assetContexts, setAssetContexts] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    // Discovery Logic
    const handleDiscover = async () => {
        if (!domainInput) return;
        Keyboard.dismiss();
        setLoading(true);
        try {
            const domainRes = await API.post("/domains", { domainName: domainInput });
            const domainId = domainRes.data._id;
            await API.post(`/asset-discovery/${domainId}/discover`);
            const assetsRes = await API.get(`/asset-discovery/${domainId}/assets`);
            const fetchedAssets = assetsRes.data.assets || [];

            const initialContexts = {};
            fetchedAssets.forEach(a => {
                initialContexts[a._id] = {
                    assetCriticality: 5, confidentialityWeight: 5, integrityWeight: 5,
                    availabilityWeight: 5, slaRequirement: 5, dependentServices: 0
                };
            });
            setAssetContexts(initialContexts);
            setAssets(fetchedAssets);
            setStep(2);
        } catch (err) {
            console.error("Discovery failed", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleServices = useCallback(async (assetId) => {
        setExpandedAssetId(prev => prev === assetId ? null : assetId);
        if (!assetServices[assetId]) {
            setLoadingServices(true);
            try {
                const res = await API.get(`/services/${assetId}/services`);
                const serviceData = Array.isArray(res.data) ? res.data : (res.data.services || []);
                setAssetServices(prev => ({ ...prev, [assetId]: serviceData }));
            } catch (err) { console.error(err); }
            finally { setLoadingServices(false); }
        }
    }, [assetServices]);

    const handleSelectAsset = useCallback((id) => {
        setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    }, []);

    const updateContext = useCallback((assetId, key, val) => {
        setAssetContexts(prev => ({
            ...prev,
            [assetId]: { ...prev[assetId], [key]: val }
        }));
    }, []);

    const handleStartScan = async () => {
        if (selectedAssets.length === 0) return;
        setLoading(true);
        try {
            const payload = {
                domainId: assets[0]?.domainId,
                scanType,
                assets: selectedAssets.map(id => ({
                    assetId: id,
                    businessContext: assetContexts[id]
                }))
            };
            const res = await API.post("/scan", payload);
            setStep(1);
            router.push({
                pathname: '/results',
                params: { activeScanId: res.data.scanId, domainName: domainInput }
            });
        } catch (err) { console.error("Scan Launch Failed:", err); }
        finally { setLoading(false); }
    };

    const filteredAssets = useMemo(() => {
        return assets.filter(asset =>
            asset.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.ip?.includes(searchTerm)
        );
    }, [assets, searchTerm]);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View className="flex-1 bg-white dark:bg-[#0b0f19]">
                {step === 1 ? (
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                        <View className="px-8 py-10 items-center">
                            <Globe size={50} color="#f97316" className="mb-6" />
                            <Text className="text-3xl font-black text-slate-900 dark:text-white uppercase italic text-center mb-8 tracking-tighter">Infrastructure Mapping</Text>
                            <TextInput
                                placeholder="e.g. internal-admin.net"
                                placeholderTextColor="#64748b"
                                value={domainInput}
                                onChangeText={setDomainInput}
                                autoCapitalize="none"
                                className="w-full bg-gray-50 dark:bg-[#111827] border-2 border-gray-100 dark:border-slate-800 rounded-3xl p-5 text-lg font-bold text-slate-900 dark:text-white"
                            />
                            <TouchableOpacity onPress={handleDiscover} disabled={loading} className="w-full bg-slate-900 dark:bg-orange-500 mt-4 p-5 rounded-3xl items-center shadow-lg">
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black uppercase tracking-widest">Discover Assets</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                ) : (
                    <FlatList
                        data={filteredAssets}
                        keyExtractor={(item) => item._id}
                        initialNumToRender={5}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                        removeClippedSubviews={true}
                        ListHeaderComponent={
                            <ListHeader
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                scanType={scanType}
                                setScanType={setScanType}
                                onStartScan={handleStartScan}
                                selectedCount={selectedAssets.length}
                            />
                        }
                        stickyHeaderIndices={[0]}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                        renderItem={({ item }) => (
                            <AssetCard
                                asset={item}
                                isDark={isDark}
                                isSelected={selectedAssets.includes(item._id)}
                                isExpanded={expandedAssetId === item._id}
                                onSelect={handleSelectAsset}
                                onExpand={toggleServices}
                                loadingServices={loadingServices}
                                services={assetServices[item._id]}
                                context={assetContexts[item._id]}
                                onContextUpdate={updateContext}
                            />
                        )}
                    />
                )}

                {loading && step === 2 && (
                    <View className="absolute inset-0 bg-white/80 dark:bg-black/80 justify-center items-center z-50">
                        <Loader2 size={40} color="#f97316" className="animate-spin" />
                        <Text className="text-slate-400 font-black uppercase text-[10px] mt-4 tracking-widest">Launching Neural Scan...</Text>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}