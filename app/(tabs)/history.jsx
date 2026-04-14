import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator,
    Platform, Alert, Modal, FlatList, useColorScheme, UIManager, LayoutAnimation, RefreshControl
} from 'react-native';
import {
    History, Globe, Clock, Loader2, Search, Activity,
    ShieldCheck, BarChart3, ClipboardList, ChevronDown, ChevronUp,
    Lock as LockIcon, Cpu, Zap, X, LayoutGrid, AlertTriangle
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import SecurityChatbot from '../../components/SecurityChatbot';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- REUSABLE MOBILE SUB-COMPONENTS ---

const InfoItem = ({ label, value, highlight, isRed, isMono, fullWidth }) => (
    <View style={{ marginBottom: 12, width: fullWidth ? '100%' : '48%' }}>
        <Text style={{ fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{label}</Text>
        <Text style={{
            fontSize: 10,
            fontWeight: highlight ? '900' : '500',
            color: isRed ? '#f43f5e' : (highlight ? '#3b82f6' : '#64748b'),
            fontFamily: isMono ? (Platform.OS === 'ios' ? 'Courier' : 'monospace') : undefined
        }}>
            {value !== undefined && value !== null ? String(value) : "N/A"}
        </Text>
    </View>
);

const ExpandableRow = memo(({ label, data, colorClass = "#f97316" }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = data?.length || 0;
    return (
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 12 }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => count > 0 && setIsExpanded(!isExpanded)}
            >
                <Text style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 8, fontWeight: '900' }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: count > 0 ? colorClass : '#475569' }}>{count} Items Found</Text>
                    {count > 0 && <ChevronDown size={10} color="#64748b" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />}
                </View>
            </TouchableOpacity>
            {isExpanded && count > 0 && (
                <View style={{ marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: 'rgba(249,115,22,0.2)' }}>
                    {data.map((item, i) => (
                        <Text key={i} style={{ fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#94a3b8', marginBottom: 4 }}>• {item}</Text>
                    ))}
                </View>
            )}
        </View>
    );
});

// --- TACTICAL ASSET CARD ---

const AssetCard = memo(({ res, isExpanded, onToggle, assetPlans, isDark }) => {
    const matchingPlan = assetPlans.find(p => p.scanResultId === res._id);
    const getClassification = (score) => {
        const s = score * 1000;
        if (s >= 900) return { label: "Quantum Safe", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
        if (s >= 700) return { label: "PQC Ready", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
        if (s >= 400) return { label: "Migration Req.", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
        return { label: "Quantum Vulnerable", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    };
    const config = getClassification(res.pqcReadyScore || 0);

    return (
        <View style={{
            marginBottom: 16, marginHorizontal: 24, borderRadius: 32, borderWidth: 1,
            borderColor: isExpanded ? '#f97316' : (isDark ? '#1e293b' : '#f1f5f9'),
            backgroundColor: isDark ? '#0f172a' : '#ffffff', overflow: 'hidden'
        }}>
            <TouchableOpacity style={{ padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onPress={() => onToggle(res._id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ padding: 12, borderRadius: 16, backgroundColor: config.bg }}><Activity size={20} color={config.color} /></View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={{ fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', textTransform: 'uppercase', fontSize: 13 }}>{res.assetId?.host}</Text>
                        <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{res.assetId?.ip} • PORT {res.port}</Text>
                    </View>
                    <Text style={{ padding: 12, borderRadius: 16, color: '#f97316' }}>{Math.round(res.pqcReadyScore * 1000)}</Text>
                </View>
                <View style={{ padding: 8, borderRadius: 100, backgroundColor: isExpanded ? '#f97316' : (isDark ? '#1e293b' : '#f1f5f9') }}>
                    <ChevronDown size={16} color={isExpanded ? "white" : "#94a3b8"} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={{ paddingHorizontal: 24, paddingBottom: 32, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9', paddingTop: 24 }}>
                    {/* Node Crypto Analysis */}
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 24, padding: 20, marginBottom: 20 }}>
                        <Text style={{ color: '#f97316', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', marginBottom: 12 }}>Node Crypto Analysis</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 8, marginBottom: 8 }}>
                            <InfoItem label="Active TLS" value={res.negotiated?.tlsVersion} highlight />
                            <InfoItem label="KEX / Size" value={`${res.negotiated?.keyExchange} (${res.negotiated?.serverTempKeySize}b)`} highlight isMono />
                            <InfoItem label="Cipher" value={res.negotiated?.cipher} fullWidth isMono />
                        </View>
                        <ExpandableRow label="ALPN Protocols" data={res.negotiated?.alpn ? [res.negotiated.alpn] : []} />
                        <ExpandableRow label="Supported TLS" data={res.supported?.tlsVersions} colorClass="#3b82f6" />
                        <ExpandableRow label="Supported Ciphers" data={res.supported?.cipherSuites} />
                        <ExpandableRow label="PQC Negotiated" data={res.pqc?.negotiated} colorClass="#10b981" />
                        <ExpandableRow label="PQC Supported" data={res.pqc?.supported} colorClass="#f97316" />
                        <ExpandableRow label="Weak Ciphers" data={res.weakCiphers} colorClass="#ef4444" />
                        <ExpandableRow label="Vulnerabilities" data={res.vulnerabilities} colorClass="#ef4444" />

                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 8, color: '#64748b', fontWeight: '900' }}>PFS SUPPORT</Text>
                                <Text style={{ fontSize: 9, color: res.pfsSupported ? '#10b981' : '#ef4444', fontWeight: '900' }}>{res.pfsSupported ? 'ENABLED' : 'DISABLED'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 8, color: '#64748b', fontWeight: '900' }}>OCSP STAPLED</Text>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '900' }}>{res.negotiated?.ocsp?.stapled ? 'YES' : 'NO'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 8, color: '#64748b', fontWeight: '900' }}>Session Reused</Text>
                                <Text style={{ fontSize: 9, color: '#10b981', fontWeight: '900', fontStyle: 'italic' }}>{res.negotiated?.sessionReused || 'N/A'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 8, color: '#64748b', fontWeight: '900' }}>PQC CONFIDENCE</Text>
                                <Text style={{ fontSize: 9, color: '#10b981', fontWeight: '900', fontStyle: 'italic' }}>{res.pqc?.confidence || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Business Context */}
                    <View style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 24, padding: 20, marginBottom: 20 }}>
                        <Text style={{ color: '#94a3b8', fontWeight: '900', fontSize: 8, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>Intelligence Metrics</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <InfoItem label="ML Score" value={Math.round(res.mlScore * 1000)} highlight />
                            <InfoItem label="Env Score" value={Math.round(res.envScore * 1000)} highlight />
                            <InfoItem label="Criticality" value={`LV: ${res.businessContext?.assetCriticality || 0}`} />
                            <InfoItem label="Dependencies" value={`${res.businessContext?.dependentServices || 0} Nodes`} />
                            <InfoItem label="Confidentiality" value={res.businessContext?.confidentialityWeight} />
                            <InfoItem label="Integrity" value={res.businessContext?.integrityWeight} />
                            <InfoItem label="Availability" value={res.businessContext?.availabilityWeight} />
                            <InfoItem label="SLA Requirement" value={res.businessContext?.slaRequirement} />
                        </View>
                    </View>

                    {/* AI Advisor */}
                    <View className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-[2.5rem] p-6 shadow-sm">
                        <Text className="text-orange-600 font-black uppercase text-[10px] mb-3">AI Migration Roadmap</Text>
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">"{matchingPlan?.recommendations}"</Text>
                        <View className="flex-row justify-between border-y border-orange-200 dark:border-orange-900/30 py-4 mb-4">
                            <View>
                                <Text className="text-[8px] font-black text-orange-500 uppercase mb-1">Rec. PQC KEX</Text>
                                <Text className="text-[10px] font-black dark:text-white">{matchingPlan?.recommendedPqcKex || "ML-KEM-768"}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-[8px] font-black text-orange-500 uppercase mb-1">Rec. PQC Signature</Text>
                                <Text className="text-[10px] font-black dark:text-white">{matchingPlan?.recommendedPqcSignature || "ML-DSA-65"}</Text>
                            </View>
                        </View>
                        {matchingPlan?.migrationSteps?.slice(0, 3).map((s, i) => (
                            <View key={i} className="flex-row gap-2 mb-1.5"><View className="w-1 h-1 bg-orange-400 rounded-full mt-1.5" /><Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-1">{s}</Text></View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
});

export default function HistoryScreen() {
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    const [domains, setDomains] = useState([]);
    const [scans, setScans] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState("");
    const [selectedScan, setSelectedScan] = useState("");
    const [domainSummary, setDomainSummary] = useState(null);
    const [cryptoInventory, setCryptoInventory] = useState([]);
    const [scanResults, setScanResults] = useState([]);
    const [assetPlans, setAssetPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [expandedAssetId, setExpandedAssetId] = useState(null);

    const [refreshing, setRefreshing] = useState(false);

    const fetchDomains = async () => {
        try {
            const res = await API.get("/domains");
            setDomains(res.data || []);
        } catch (err) { console.error(err); }
        finally {
            setRefreshing(false); // ✅ Stop spinner
        }
    };
    useEffect(() => {
        fetchDomains();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        
        // RESET TO INITIAL STATE
        setSelectedDomain("");
        setSelectedScan("");
        setScans([]);
        setDomainSummary(null);
        setCryptoInventory([]);
        setScanResults([]);
        setAssetPlans([]);
        setExpandedAssetId(null);

        // Re-fetch base data
        await fetchDomains();
    }, []);

    const handleDomainSelect = async (domain) => {
        setIsDomainModalOpen(false);
        setSelectedDomain(domain._id);
        setSelectedScan("");
        setScanResults([]);
        setDomainSummary(null);
        try {
            const res = await API.get(`/scan/domain/${domain._id}`);
            setScans(Array.isArray(res.data) ? res.data : (res.data.scans || []));
        } catch (err) { console.error(err); }
    };

    const handleFetchHistory = async (scanId) => {
        setIsScanModalOpen(false);
        if (!scanId) return;
        setSelectedScan(scanId);
        setLoading(true);
        try {
            const [summaryRes, inventoryRes, resultsRes, roadmapRes] = await Promise.all([
                API.get(`/domains/${selectedDomain}/summary`),
                API.get(`/domains/${selectedDomain}/crypto-inventory`),
                API.get(`/scan/${scanId}/results`),
                API.get(`/scan/${scanId}/recommendations`).catch(() => ({ data: [] }))
            ]);
            setDomainSummary(summaryRes.data);
            setCryptoInventory(inventoryRes.data.algorithms || []);
            setScanResults(resultsRes.data);
            setAssetPlans(roadmapRes.data);
        } catch (err) { Alert.alert("Error", "Historical sync failed."); }
        finally { setLoading(false); }
    };

    const toggleAsset = useCallback((id) => {
        if (Platform.OS === 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedAssetId(prev => prev === id ? null : id);
    }, []);

    const renderHeader = () => (
        <View style={{ paddingTop: insets.top + 20, paddingBottom: 24 }}>
            <View style={{ paddingHorizontal: 24, marginBottom: 32, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ padding: 16, backgroundColor: '#fff7ed', borderRadius: 20, marginRight: 20 }}>
                    <History size={28} color="#f97316" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '900', color: isDark ? '#fff' : '#0f172a', textTransform: 'uppercase' }}>Audit History</Text>
            </View>

            <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12 }}>
                <TouchableOpacity onPress={() => setIsDomainModalOpen(true)} style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Globe size={14} color="#f97316" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', flex: 1, marginLeft: 8 }} numberOfLines={1}>
                        {domains.find(d => d._id === selectedDomain)?.domainName || "Select Domain"}
                    </Text>
                    <ChevronDown size={14} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity disabled={!selectedDomain} onPress={() => setIsScanModalOpen(true)} style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: !selectedDomain ? 0.4 : 1 }}>
                    <Clock size={14} color="#f97316" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', flex: 1, marginLeft: 8 }} numberOfLines={1}>
                        {scans.find(s => s._id === selectedScan) ? new Date(scans.find(s => s._id === selectedScan).createdAt).toLocaleDateString() : "Select Entry"}
                    </Text>
                    <ChevronDown size={14} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {domainSummary && (
                <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                    {/* STRATEGIC DOMAIN HUD */}
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 40, padding: 32, borderWeight: 1, borderColor: '#1e293b' }}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, borderWeight: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                                <Text style={{ color: '#ef4444', fontSize: 8, fontWeight: '900' }}>THREAT: {domainSummary.recommendation?.riskLevel}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 }}>
                                <Text style={{ color: '#3b82f6', fontSize: 8, fontWeight: '900' }}>COVERAGE: {domainSummary.assets?.scannedAssets}/{domainSummary.assets?.totalAssets}</Text>
                            </View>
                        </View>

                        <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', fontStyle: 'italic' }}>GRADE: <Text style={{ color: '#10b981' }}>{Math.round(domainSummary.pqcReadiness?.averageScore * 1000)}</Text></Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 16, lineHeight: 20, fontStyle: 'italic' }}>"{domainSummary.recommendation?.summary}"</Text>

                        {/* STRATEGIC PQC STACK */}
                        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                            <Text style={{ color: '#f97316', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12 }}>Strategic PQC Stack</Text>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '900' }}>KEX</Text>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }}>{domainSummary.recommendation?.recommendedPqcKex}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '900' }}>SIGNATURE</Text>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }}>{domainSummary.recommendation?.recommendedPqcSignature}</Text>
                            </View>
                        </View>

                        {/* MIGRATION STEPS */}
                        <View style={{ marginTop: 24 }}>
                            <Text style={{ color: '#f97316', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12 }}>Migration Strategy</Text>
                            {domainSummary.recommendation?.migrationStrategy?.map((step, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                                    <Text style={{ color: '#f97316', fontWeight: '900', fontSize: 10 }}>{idx + 1}.</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', flex: 1 }}>{step}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* CIPHER FOOTPRINT */}
                    <View style={{ marginTop: 40, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <Activity size={16} color="#f97316" />
                        <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#94a3b8' : '#475569', marginLeft: 8, textTransform: 'uppercase' }}>Global Cipher Footprint</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {cryptoInventory.map((alg, i) => (
                            <View key={i} style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                                <Text style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 9, fontWeight: '900' }}>{alg}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ marginTop: 48, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <LayoutGrid size={16} color="#f97316" />
                        <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#fff' : '#0f172a', marginLeft: 8, textTransform: 'uppercase' }}>Node Reconstruction</Text>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0b0f19' : '#fff' }}>
            <FlatList
                data={scanResults}
                keyExtractor={item => item._id}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => <AssetCard res={item} isExpanded={expandedAssetId === item._id} onToggle={toggleAsset} assetPlans={assetPlans} isDark={isDark} />}
                ListEmptyComponent={!loading && <View style={{ paddingVertical: 80, alignItems: 'center', opacity: 0.3 }}><Search size={60} color="#94a3b8" /><Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', marginTop: 16, textTransform: 'uppercase' }}>Neural Sync Required</Text></View>}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#f97316"
                        colors={["#f97316"]}
                    />
                }
            />

            {loading && <View style={{ position: 'absolute', inset: 0, backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}><Loader2 size={40} color="#f97316" className="animate-spin" /><Text style={{ color: '#94a3b8', fontWeight: '900', fontSize: 10, marginTop: 16, textTransform: 'uppercase' }}>Restoring Environment...</Text></View>}

            {/* Modal for Domains */}
            <Modal visible={isDomainModalOpen} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setIsDomainModalOpen(false)}>
                    <View style={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: 32, overflow: 'hidden', maxHeight: '60%' }}>
                        <View style={{ padding: 24, backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>SELECT DOMAIN</Text>
                            <X size={20} color="white" />
                        </View>
                        <FlatList data={domains} keyExtractor={i => i._id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleDomainSelect(item)} style={{ padding: 20, marginBottom: 8, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 16 }}>
                                <Text style={{ color: isDark ? '#f1f5f9' : '#334155', fontWeight: '900', fontSize: 12 }}>{item.domainName}</Text>
                            </TouchableOpacity>
                        )} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal for Scans */}
            <Modal visible={isScanModalOpen} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setIsScanModalOpen(false)}>
                    <View style={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: 32, overflow: 'hidden', maxHeight: '60%' }}>
                        <View style={{ padding: 24, backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>SELECT AUDIT ENTRY</Text>
                            <X size={20} color="white" />
                        </View>
                        <FlatList data={scans} keyExtractor={i => i._id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleFetchHistory(item._id)} style={{ padding: 20, marginBottom: 8, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 16 }}>
                                <Text style={{ color: isDark ? '#f1f5f9' : '#334155', fontWeight: '900', fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</Text>
                            </TouchableOpacity>
                        )} />
                    </View>
                </TouchableOpacity>
            </Modal>

            <SecurityChatbot scanId={selectedScan} />
        </View>
    );
}