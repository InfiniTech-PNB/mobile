import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    Platform, Alert, Modal, FlatList, useColorScheme, UIManager
} from 'react-native';
import {
    Database, Globe, Clock, Loader2, Search,
    Cpu, Key, Shield, ChevronDown, ChevronUp, Lock as LockIcon, X, Download
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import SecurityChatbot from '../../components/SecurityChatbot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- REUSABLE MOBILE COMPONENTS ---

const InfoItem = ({ label, value, highlight, isRed, fullWidth, isDark }) => (
    <View style={{ marginBottom: 12, width: fullWidth ? '100%' : '48%' }}>
        <Text style={{ fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{label}</Text>
        <Text style={{
            fontSize: 10,
            fontWeight: highlight ? '900' : '500',
            color: isRed ? '#f43f5e' : (isDark ? '#e2e8f0' : '#1e293b')
        }}>
            {value !== undefined && value !== null ? String(value) : "null"}
        </Text>
    </View>
);

const ExpandableRow = memo(({ label, data, isDark }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = data?.length || 0;
    return (
        <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', paddingVertical: 12 }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => count > 0 && setIsExpanded(!isExpanded)}
            >
                <Text style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 8, fontWeight: '900' }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: count > 0 ? '#f97316' : '#475569' }}>{count} Items</Text>
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

// --- MAIN SCREEN ---

export default function CBOMHistoryScreen() {
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    // Selection States
    const [domains, setDomains] = useState([]);
    const [scans, setScans] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState("");
    const [selectedScan, setSelectedScan] = useState("");

    // Data & UI States
    const [cbomData, setCbomData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [activeTechTab, setActiveTechTab] = useState("algorithms");
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);

    // Initial Load: Fetch Domains
    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const res = await API.get("/domains");
                setDomains(res.data || []);
            } catch (err) { console.error("Error fetching domains:", err); }
        };
        fetchDomains();
    }, []);

    // Fetch Scans when Domain changes
    const handleDomainSelect = async (domain) => {
        setIsDomainModalOpen(false);
        setSelectedDomain(domain._id);
        setSelectedScan("");
        setCbomData(null);
        try {
            const res = await API.get(`/scan/domain/${domain._id}`);
            setScans(Array.isArray(res.data) ? res.data : (res.data.scans || []));
        } catch (err) { console.error("Error fetching scans:", err); }
    };

    // Fetch CBOM Data
    const handleFetchCBOM = async (scanId) => {
        setIsScanModalOpen(false);
        setSelectedScan(scanId);
        setLoading(true);
        try {
            const res = await API.get(`/cbom/${scanId}/cbom`);
            setCbomData(res.data);
        } catch (err) { Alert.alert("Error", "Failed to retrieve CBOM data."); }
        finally { setLoading(false); }
    };

    const handleDownloadPDF = async () => {
        if (!selectedScan) return;
        setDownloading(true);
        console.log("Downloading pdf");
        try {
            const filename = `CBOM-Report-${selectedScan.substring(0, 8)}.pdf`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            const url = `${API.defaults.baseURL}/cbom/${selectedScan}/cbom/pdf`;
            const token = await SecureStore.getItemAsync('token');

            const downloadResumable = FileSystem.createDownloadResumable(
                url, fileUri, { headers: { 'Accept': 'application/pdf', 'Authorization': `Bearer ${token}` } }
            );

            const result = await downloadResumable.downloadAsync();
            if (result && result.status === 200) {
                await Sharing.shareAsync(result.uri);
            } else {
                throw new Error(`Server returned ${result?.status}`);
            }
        } catch (err) {
            Alert.alert("Export Failed", "Could not generate cryptographic report.");
        } finally {
            setDownloading(false);
        }
    };

    const currentDomainName = domains.find(d => d._id === selectedDomain)?.domainName || "Select Domain";
    const currentScanName = scans.find(s => s._id === selectedScan)
        ? new Date(scans.find(s => s._id === selectedScan).createdAt).toLocaleDateString()
        : "Select Audit Entry";

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0b0f19' : '#fff' }}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* --- HEADER --- */}
                <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                        <View style={{ padding: 16, backgroundColor: '#fff7ed', borderRadius: 20 }}>
                            <Database size={28} color="#f97316" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: isDark ? '#fff' : '#0f172a', textTransform: 'uppercase' }}>CBOM Registry</Text>
                            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Archive Discovery Engine</Text>
                        </View>
                    </View>

                    {/* SELECTION HUD */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => setIsDomainModalOpen(true)} style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Globe size={14} color="#f97316" />
                            <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', flex: 1, marginLeft: 8 }} numberOfLines={1}>{currentDomainName}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity disabled={!selectedDomain} onPress={() => setIsScanModalOpen(true)} style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: !selectedDomain ? 0.4 : 1 }}>
                            <Clock size={14} color="#f97316" />
                            <Text style={{ fontSize: 10, fontWeight: '900', color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', flex: 1, marginLeft: 8 }} numberOfLines={1}>{currentScanName}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- TECH TABS (Sticky) --- */}
                <View style={{ backgroundColor: isDark ? '#0b0f19' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
                        {[
                            { id: 'algorithms', label: 'Algorithms', icon: Cpu },
                            { id: 'keys', label: 'Keys', icon: Key },
                            { id: 'protocols', label: 'Protocols', icon: Globe },
                            { id: 'certificates', label: 'Certificates', icon: Shield }
                        ].map(tab => (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTechTab(tab.id)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100,
                                    backgroundColor: activeTechTab === tab.id ? '#f97316' : (isDark ? '#1e293b' : '#f8fafc')
                                }}
                            >
                                <tab.icon size={14} color={activeTechTab === tab.id ? '#fff' : '#64748b'} />
                                <Text style={{ fontSize: 10, fontWeight: '900', color: activeTechTab === tab.id ? '#fff' : '#64748b', textTransform: 'uppercase' }}>{tab.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* --- DATA AREA --- */}
                <View style={{ padding: 24, paddingBottom: 100 }}>
                    {loading ? (
                        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                            <Loader2 size={40} color="#f97316" className="animate-spin" />
                            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '900', marginTop: 16 }}>DECRYPTING ARCHIVE...</Text>
                        </View>
                    ) : cbomData ? (
                        cbomData?.[activeTechTab]?.map((item, idx) => (
                            <View key={idx} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2.5rem] mb-4 border border-slate-100 dark:border-slate-800">
                                <Text className="text-orange-500 font-black uppercase text-[11px] mb-4 border-b border-orange-500/10 pb-2">
                                    {item.name || item.protocol || item.asset || "Crypto Node"}
                                </Text>
                                <View className="flex-row flex-wrap justify-between">
                                    {activeTechTab === 'algorithms' && (
                                        <>
                                            <InfoItem label="Asset Type" value={item.assetType} />
                                            <InfoItem label="Primitive" value={item.primitive} />
                                            <InfoItem label="Op Mode" value={item.mode} />
                                            <InfoItem label="Security" value={`${item.classicalSecurityLevel} Bits`} highlight />
                                            <InfoItem label="Standard OID" value={item.oid} fullWidth />
                                        </>
                                    )}
                                    {activeTechTab === 'keys' && (
                                        <>
                                            <InfoItem label="Asset Type" value={item.assetType} />
                                            <InfoItem label="Size" value={`${item.size} Bits`} highlight />
                                            <InfoItem label="State" value={item.state} />
                                            <InfoItem label="Creation" value={item.creationDate} />
                                            <InfoItem label="Activation" value={item.activationDate} />
                                            <InfoItem label="System ID" value={item.id} fullWidth />
                                        </>
                                    )}
                                    {activeTechTab === 'protocols' && (
                                        <>
                                            <InfoItem label="Protocol" value={item.name} />
                                            <InfoItem label="Version" value={Array.isArray(item.version) ? item.version.join(', ') : item.version} />
                                            <InfoItem label="ALPN Header" value={item.alpn} />
                                            <InfoItem label="Protocol OID" value={item.oid} fullWidth />
                                            <ExpandableRow label="Cipher Suites" data={item.cipherSuites} />
                                        </>
                                    )}
                                    {activeTechTab === 'certificates' && (
                                        <>
                                            <InfoItem label="Subject Common Name" value={item.leafCertificate?.subjectName} highlight fullWidth />
                                            <InfoItem label="Issuing Authority" value={item.leafCertificate?.issuerName} fullWidth />
                                            <InfoItem label="Format" value={item.leafCertificate?.certificateFormat} />
                                            <InfoItem label="Fingerprint" value={item.leafCertificate?.fingerprintSha256} fullWidth />
                                            <InfoItem label="Valid From" value={item.leafCertificate?.validityPeriod?.notBefore} />
                                            <InfoItem label="Valid Until" value={item.leafCertificate?.validityPeriod?.notAfter} isRed />
                                            <InfoItem label="Public Key Ref" value={item.leafCertificate?.subjectPublicKeyReference} fullWidth />
                                            <InfoItem label="Signature Ref" value={item.leafCertificate?.signatureAlgorithmReference} fullWidth />
                                            <InfoItem label="CA Status" value={item.leafCertificate?.certificateExtension?.basicConstraints?.ca ? "Authority" : "End Entity"} />
                                            <InfoItem label="Path Len" value={item.leafCertificate?.certificateExtension?.basicConstraints?.pathLength} />
                                            <ExpandableRow label="Key Usage" data={item.leafCertificate?.certificateExtension?.keyUsage} />
                                            <ExpandableRow label="Extended Key Usage" data={item.leafCertificate?.certificateExtension?.extendedKeyUsage} />

                                            {/* TRUST CHAIN TREE */}
                                            <View className="w-full mt-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                <Text className="text-[8px] font-black text-slate-400 uppercase mb-3">Trust Chain Tree</Text>
                                                {item.certificateChain?.map((node, nIdx) => (
                                                    <View key={nIdx} className="mb-3 border-l-2 border-orange-500/20 pl-3">
                                                        <Text className="text-[10px] font-black text-slate-800 dark:text-white break-all">{node.subject}</Text>
                                                        <Text className="text-[8px] text-slate-400 italic">Issuer: {node.issuer}</Text>
                                                        <Text className="text-[8px] font-mono text-slate-500 mt-1 uppercase">{node.fingerprintSha256}</Text>
                                                    </View>
                                                ))}
                                            </View>

                                            {/* RENEWAL HISTORY */}
                                            <View className="w-full mt-4">
                                                <Text className="text-[8px] font-black text-slate-400 uppercase mb-2">Renewal History</Text>
                                                {item.leafCertificate?.certificateHistory?.map((h, hIdx) => (
                                                    <View key={hIdx} className="bg-white dark:bg-slate-900 p-3 rounded-2xl mb-2 border border-slate-100 dark:border-slate-800">
                                                        <Text className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{h.issuer}</Text>
                                                        <Text className="text-[8px] font-mono text-slate-400">{h.notBefore} → {h.notAfter}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={{ paddingVertical: 100, alignItems: 'center', opacity: 0.3 }}>
                            <Search size={60} color="#94a3b8" />
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', marginTop: 16, textTransform: 'uppercase' }}>Select entry to initiate lookup</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* --- EXPORT BUTTON (Fixed) --- */}
            <TouchableOpacity
                disabled={!selectedScan || downloading}
                onPress={handleDownloadPDF}
                style={{
                    position: 'absolute', bottom: 30, left: 30, right: 30, height: 60, borderRadius: 20,
                    backgroundColor: !selectedScan ? '#cbd5e1' : '#f97316',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 5
                }}
            >
                {downloading ? <ActivityIndicator color="white" /> : <Download size={20} color="white" />}
                <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>
                    {downloading ? "Generating Report..." : "Export CBOM PDF"}
                </Text>
            </TouchableOpacity>

            {/* MODALS */}
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

            <Modal visible={isScanModalOpen} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setIsScanModalOpen(false)}>
                    <View style={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: 32, overflow: 'hidden', maxHeight: '60%' }}>
                        <View style={{ padding: 24, backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>SELECT AUDIT ENTRY</Text>
                            <X size={20} color="white" />
                        </View>
                        <FlatList data={scans} keyExtractor={i => i._id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleFetchCBOM(item._id)} style={{ padding: 20, marginBottom: 8, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 16 }}>
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