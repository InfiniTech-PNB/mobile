import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Zap, ShieldCheck, Loader2, FileCode, CheckCircle2, AlertTriangle, Database,
    XCircle, Activity, ClipboardList, Key, Shield,
    ChevronDown, ChevronUp, Cpu, Globe, Server, BarChart3, Info, Hash, Link,
    Lock as LockIcon, MessageSquareText, Search, ArrowLeft, Download
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import SecurityChatbot from '../../components/SecurityChatbot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';

// --- REUSABLE COMPONENTS ---

const InfoItem = ({ label, value, highlight, isRed, fullWidth }) => (
    <View className={`mb-3 ${fullWidth ? 'w-full' : 'w-[48%]'}`}>
        <Text className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 tracking-tighter">{label}</Text>
        <Text className={`text-xs ${highlight ? 'font-black text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'} ${isRed ? 'text-rose-500' : ''}`}>
            {value !== undefined && value !== null ? String(value) : "null"}
        </Text>
    </View>
);

const StatusFlag = ({ label, value, activeColor = "text-emerald-400" }) => (
    <View className="flex-row justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
        <Text className="text-slate-500 uppercase text-[8px] font-black tracking-widest">{label}</Text>
        <Text className={`text-[9px] font-black ${value ? activeColor : 'text-red-400'}`}>
            {value ? 'YES / ENABLED' : 'NO / DISABLED'}
        </Text>
    </View>
);

const ExpandableRow = ({ label, data, colorClass = "text-orange-500" }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = data?.length || 0;
    return (
        <View className="border-b border-slate-100 dark:border-slate-800 py-3 last:border-0">
            <TouchableOpacity
                className="flex-row justify-between items-center"
                onPress={() => count > 0 && setIsExpanded(!isExpanded)}
            >
                <Text className="text-slate-500 uppercase text-[9px] font-black">{label}</Text>
                <View className="flex-row items-center gap-2">
                    <Text className={`text-[10px] font-bold ${count > 0 ? colorClass : 'text-slate-400'}`}>
                        {count} Items Found
                    </Text>
                    {count > 0 && <ChevronDown size={12} color="#94a3b8" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />}
                </View>
            </TouchableOpacity>
            {isExpanded && count > 0 && (
                <View className="mt-2 pl-2 border-l-2 border-orange-500/20">
                    {data.map((item, i) => (
                        <Text key={i} className="text-[9px] font-mono text-slate-500 dark:text-slate-400 leading-tight mb-1">• {item}</Text>
                    ))}
                </View>
            )}
        </View>
    );
};

export default function ScanResultsScreen() {
    const { activeScanId, domainName } = useLocalSearchParams();

    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [scanResults, setScanResults] = useState([]);
    const [cbomData, setCbomData] = useState(null);
    const [assetPlans, setAssetPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [activeTechTab, setActiveTechTab] = useState("algorithms");
    const [expandedAssetId, setExpandedAssetId] = useState(null);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        if (!activeScanId) return;
        setDownloading(true);

        try {
            const filename = `CBOM-Report-${activeScanId.substring(0, 8)}.pdf`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            const url = `${API.defaults.baseURL}/cbom/${activeScanId}/cbom/pdf`;

            // 1. Fetch the token directly from SecureStore (Matches your API interceptor logic)
            const token = await SecureStore.getItemAsync('token');

            // 2. Build headers manually
            const headers = {
                'Accept': 'application/pdf',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            };

            // 3. Debug logs
            console.log("🔗 Downloading from:", url);
            console.log("🔑 Token found in SecureStore:", token ? "YES" : "NO");

            const downloadResumable = FileSystem.createDownloadResumable(
                url,
                fileUri,
                { headers }
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.status === 200) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(result.uri);
                } else {
                    Alert.alert("Success", "PDF saved to Kavachai local storage.");
                }
            } else {
                // Handle specific status codes
                const errorMsg = result.status === 401
                    ? "Unauthorized: Please log in again."
                    : `Server Error: ${result.status}`;
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("PDF Export Error:", err);
            Alert.alert("Export Failed", err.message || "Could not generate the cryptographic report.");
        } finally {
            setDownloading(false);
        }
    };

    // --- ADDED: MISSING getClassification FUNCTION ---
    const getClassification = (score) => {
        const s = score * 1000;
        if (s >= 900) return { label: "Quantum Safe", color: "#10b981", bg: "bg-emerald-500/10" };
        if (s >= 700) return { label: "PQC Ready", color: "#3b82f6", bg: "bg-blue-500/10" };
        if (s >= 400) return { label: "Migration Required", color: "#f59e0b", bg: "bg-amber-500/10" };
        return { label: "Quantum Vulnerable", color: "#ef4444", bg: "bg-red-500/10" };
    };

    useEffect(() => {
        if (activeScanId) runFullOrchestration();
    }, [activeScanId]);

    const runFullOrchestration = async () => {
        setLoading(true);
        try {
            setStatusMsg("Fetching cryptographic scan results...");
            const res = await API.get(`/scan/${activeScanId}/results`);
            setScanResults(res.data);
            if (res.data.length === 0) throw new Error("SCAN_EMPTY");

            setStatusMsg("Synchronizing CBOM...");
            const cbomRes = await API.get(`/cbom/${activeScanId}/cbom`).catch(() => null);
            if (cbomRes) setCbomData(cbomRes.data);

            setStatusMsg("AI Engine generating roadmap...");
            const recRes = await API.get(`/scan/${activeScanId}/recommendations`).catch(() => null);
            if (recRes) setAssetPlans(recRes.data);

            setStatusMsg("Analysis Complete.");
        } catch (err) {
            console.error(err);
            setStatusMsg("Sync Failed");
        } finally {
            setLoading(false);
        }
    };

    if (!activeScanId || activeScanId === "undefined") {
        return (
            <View className="flex-1 bg-white dark:bg-[#0b0f19] justify-center items-center p-10">
                <View className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[3rem] items-center border-2 border-dashed border-slate-200">
                    <Search size={50} color="#94a3b8" />
                    <Text className="text-xl font-black text-slate-900 dark:text-white uppercase italic mt-6">No Active Audit</Text>
                    <TouchableOpacity onPress={() => router.push('/scan')} className="mt-8 bg-orange-500 px-8 py-4 rounded-2xl shadow-lg">
                        <Text className="text-white font-black uppercase text-[10px]">Go to Scan</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (loading) return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-[#0b0f19]">
            <Loader2 size={40} color="#f97316" className="animate-spin" />
            <Text className="text-slate-400 font-black uppercase text-[10px] mt-4">{statusMsg}</Text>
        </View>
    );

    const avgScore = scanResults.length > 0
        ? Math.round((scanResults.reduce((acc, curr) => acc + (curr.pqcReadyScore || 0), 0) / scanResults.length) * 1000)
        : 0;

    return (
        <View className="flex-1 bg-white dark:bg-[#0b0f19]">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="p-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 120 }}>

                    {/* --- HEADER --- */}
                    <View className="bg-slate-900 rounded-[2.5rem] p-8 flex-row justify-between items-center shadow-2xl mb-8">
                        <View className="flex-1">
                            <Text className="text-orange-500 font-black text-[10px] uppercase tracking-widest mb-1">Domain Health</Text>
                            <Text className="text-white font-black text-2xl tracking-tighter uppercase">{domainName}</Text>
                            <Text className="text-slate-500 font-mono text-[8px] mt-2 italic">REF_ID: {activeScanId}</Text>
                        </View>
                        <View className="items-center ml-4">
                            <Text className="text-5xl font-black text-emerald-400">{avgScore}</Text>
                            <Text className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Domain Score</Text>
                        </View>
                    </View>

                    {/* --- ASSET INTELLIGENCE --- */}
                    {scanResults.map((res) => {
                        const config = getClassification(res.pqcReadyScore || 0);
                        const isExpanded = expandedAssetId === res._id;
                        const matchingPlan = assetPlans.find(p => p.scanResultId === res._id);

                        return (
                            <View key={res._id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] mb-4 overflow-hidden shadow-sm">
                                <TouchableOpacity className="p-6 flex-row justify-between items-center" onPress={() => setExpandedAssetId(isExpanded ? null : res._id)}>
                                    <View className="flex-row items-center flex-1">
                                        <View className={`p-3 rounded-2xl ${config.bg}`}><Activity size={20} color={config.color} /></View>
                                        <View className="ml-4 flex-1">
                                            <Text className="font-black text-slate-900 dark:text-white uppercase text-sm" numberOfLines={1}>{res.assetId?.host}</Text>
                                            <Text className="text-[10px] font-bold text-slate-400 mt-1">{res.assetId?.ip} • PORT {res.port}</Text>
                                        </View>
                                    </View>
                                    <ChevronDown size={20} color="#94a3b8" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View className="px-6 pb-8 border-t border-slate-50 dark:border-slate-800 pt-6">
                                        {/* 1. NODE CRYPTO ANALYSIS */}
                                        <View className="bg-slate-900 rounded-[2rem] p-6 mb-6">
                                            <Text className="text-orange-500 font-black text-[9px] uppercase mb-4 tracking-widest italic">Node Crypto Analysis</Text>
                                            <View className="flex-row flex-wrap justify-between border-b border-slate-800 pb-2 mb-2">
                                                <InfoItem label="TLS Version" value={res.negotiated?.tlsVersion} highlight />
                                                <InfoItem label="KEX / Size" value={`${res.negotiated?.keyExchange} (${res.negotiated?.serverTempKeySize}b)`} highlight />
                                                <InfoItem label="Negotiated Cipher" value={res.negotiated?.cipher} highlight fullWidth />
                                            </View>

                                            <ExpandableRow label="ALPN Protocols" data={res.negotiated?.alpn ? [res.negotiated.alpn] : []} />
                                            <ExpandableRow label="Supported TLS Versions" data={res.supported?.tlsVersions} colorClass="text-blue-400" />
                                            <ExpandableRow label="Supported Cipher Suites" data={res.supported?.cipherSuites} />
                                            <ExpandableRow label="PQC Negotiated" data={res.pqc?.negotiated} colorClass="text-emerald-400" />
                                            <ExpandableRow label="PQC Supported Groups" data={res.pqc?.supported} colorClass="text-orange-400" />
                                            <ExpandableRow label="Weak Ciphers" data={res.weakCiphers} colorClass="text-red-400" />
                                            <ExpandableRow label="Vulnerabilities" data={res.vulnerabilities} colorClass="text-red-500" />

                                            <View className="mt-4 pt-4 border-t border-slate-800">
                                                <StatusFlag label="PFS Support" value={res.pfsSupported} />
                                                <StatusFlag label="OCSP Stapled" value={res.negotiated?.ocsp?.stapled} />
                                                <StatusFlag label="Session Reused" value={res.negotiated?.sessionReused} />
                                                <View className="flex-row justify-between py-2 border-b border-white/5">
                                                    <Text className="text-slate-500 uppercase text-[8px] font-black">PQC Confidence</Text>
                                                    <Text className="text-[10px] font-black text-emerald-500 italic">{res.pqc?.confidence || 'N/A'}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* 2. ENVIRONMENT WEIGHTS */}
                                        <View className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-6">
                                            <Text className="text-slate-400 font-black text-[9px] uppercase mb-4 tracking-widest text-center">Business Intelligence Metrics</Text>
                                            <View className="flex-row flex-wrap justify-between">
                                                <InfoItem label="Confidentiality Weight" value={res.businessContext?.confidentialityWeight} />
                                                <InfoItem label="Integrity Weight" value={res.businessContext?.integrityWeight} />
                                                <InfoItem label="Availability Weight" value={res.businessContext?.availabilityWeight} />
                                                <InfoItem label="SLA Requirement" value={res.businessContext?.slaRequirement} />
                                                <InfoItem label="Criticality" value={res.businessContext?.assetCriticality} />
                                                <InfoItem label="Node Dependencies" value={res.businessContext?.dependentServices} />
                                                <InfoItem label="ML Score" value={Math.round(res.mlScore * 1000)} highlight />
                                                <InfoItem label="Env Score" value={Math.round(res.envScore * 1000)} highlight />
                                            </View>
                                        </View>

                                        {/* 3. AI ADVISOR */}
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
                    })}

                    {/* --- GLOBAL TECHNICAL CBOM --- */}
                    <View className="mt-10 bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                        <View className="bg-slate-900 p-4 flex-row justify-between items-center">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
                                {['algorithms', 'keys', 'protocols', 'certificates'].map(tab => (
                                    <TouchableOpacity key={tab} onPress={() => setActiveTechTab(tab)} className={`px-5 py-2.5 rounded-full mr-2 ${activeTechTab === tab ? 'bg-orange-500' : 'bg-white/5'}`}>
                                        <Text className={`text-[8px] font-black uppercase tracking-widest ${activeTechTab === tab ? 'text-white' : 'text-slate-500'}`}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                onPress={handleDownloadPDF} // Change this
                                disabled={downloading}      // Add this
                                className="bg-emerald-500 p-3 rounded-2xl ml-2 shadow-lg active:scale-95"
                            >
                                {downloading ? (
                                    <ActivityIndicator size="small" color="white" /> // Show loader when downloading
                                ) : (
                                    <Download size={18} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View className="p-6">
                            {cbomData?.[activeTechTab]?.map((item, idx) => (
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
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* --- SECURITY CHATBOT --- */}
            <SecurityChatbot scanId={activeScanId} />
        </View>
    );
}