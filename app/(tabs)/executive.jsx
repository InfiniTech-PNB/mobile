import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, 
    ActivityIndicator, Platform, useColorScheme , RefreshControl
} from 'react-native';
import { 
    Download, ArrowLeft, Globe, ShieldCheck, 
    Award, Layers, Lock, Search, Cpu, Zap, Activity 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';

// --- SUB-COMPONENTS ---

const InventoryItem = ({ label, value, icon, isDark }) => (
    <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
        <View className="flex-row items-center gap-3 text-slate-500">
            {icon}
            <Text className="text-[9px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">{label}</Text>
        </View>
        <Text className="text-xs font-black text-slate-900 dark:text-white font-mono">{value.toLocaleString()}</Text>
    </View>
);

const ExecutivesReportingTab = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSummary = async () => {
        try {
            const res = await API.get("/reports/executive-summary");
            setData(res.data);
        } catch (err) { 
            console.error("HUD Fetch Error:", err); 
        } finally { 
            setLoading(false); 
            setRefreshing(false);
        }
    };
    useEffect(() => {
        fetchSummary();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setData(null); // Reset to initial state
        await fetchSummary();
        setRefreshing(false);
    }, []);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const filename = `Executive_Report_${new Date().getTime()}.pdf`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            const url = `${API.defaults.baseURL}/reports/executive-download`;
            const token = await SecureStore.getItemAsync('token');

            const downloadResumable = FileSystem.createDownloadResumable(
                url, fileUri, { 
                    headers: { 
                        'Accept': 'application/pdf', 
                        'Authorization': `Bearer ${token}` 
                    } 
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (result && result.status === 200) {
                await Sharing.shareAsync(result.uri);
            }
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading || !data) return ( // Added !data check to show loader on refresh reset
        <View className="flex-1 bg-white dark:bg-[#0b0f19] items-center justify-center">
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 mt-4">
                Aggregating Global Audit Data...
            </Text>
        </View>
    );

    return (
        <ScrollView 
            className="flex-1 bg-white dark:bg-[#0b0f19]"
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    tintColor="#f97316" // Matches your orange theme
                    colors={["#f97316"]} 
                />
            }
        >
            <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 100 }}>
                
                {/* --- HEADER NAVIGATION --- */}
                <View className="flex-row justify-between items-center mb-10">
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        className="flex-row items-center gap-2"
                    >
                        <ArrowLeft size={16} color="#94a3b8" />
                        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={handleDownload}
                        disabled={isDownloading}
                        className="bg-slate-900 dark:bg-orange-500 px-5 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg"
                    >
                        {isDownloading ? <ActivityIndicator size="small" color="white" /> : <Download size={14} color="white" />}
                        <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                            {isDownloading ? 'Syncing...' : 'Export PDF'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* --- PAGE TITLE --- */}
                <View className="mb-8">
                    <Text className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Strategic PQC Audit
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Executive Summary — Internal
                    </Text>
                </View>

                <View className="space-y-6">
                    
                    {/* 1. Assets Discovery */}
                    <View className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 mb-4 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                        <View className="flex-row items-center gap-3 mb-6">
                            <Search size={20} color="#f97316" />
                            <Text className="font-black uppercase text-xs tracking-widest italic text-orange-500">Discovery</Text>
                        </View>
                        <View className="flex-row justify-between items-end">
                            <View>
                                <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {data.discovery.totalAssets + data.discovery.totalDomains}
                                </Text>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Endpoints Found</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-xl font-black text-slate-900 dark:text-white">{data.discovery.cloudAssets}</Text>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Cloud Assets</Text>
                            </View>
                        </View>
                    </View>

                    {/* 2. Cyber Rating */}
                    <View className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 mb-4 border border-slate-100 dark:border-slate-800">
                        <View className="flex-row items-center gap-3 mb-6">
                            <Award size={20} color="#10b981" />
                            <Text className="font-black uppercase text-xs tracking-widest italic text-emerald-500">Cyber Rating</Text>
                        </View>
                        <View className="space-y-2">
                            {['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'].map((tier, i) => {
                                const isActive = data.cyberRating.includes(tier);
                                return (
                                    <View key={tier} className={`flex-row items-center gap-4 p-3 rounded-2xl border ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'opacity-20 border-transparent'}`}>
                                        <View className={`w-6 h-6 rounded-lg items-center justify-center ${isActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <Text className="text-white font-black text-[10px]">{String.fromCharCode(65 + i)}</Text>
                                        </View>
                                        <Text className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Tier {i + 1} {tier}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* 3. Posture of PQC (The Big Card) */}
                    <View className="bg-slate-900 mb-4 dark:bg-black rounded-[2.5rem] p-8 border border-slate-800 relative overflow-hidden">
                        <View className="flex-row items-center gap-3 mb-8">
                            <ShieldCheck size={24} color="#f97316" />
                            <Text className="font-black uppercase text-sm tracking-[0.2em] italic text-orange-500">Posture of PQC</Text>
                        </View>

                        <View className="flex-row items-center justify-between mb-8">
                            <View className="flex-1 pr-6 space-y-6">
                                <View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-[8px] font-black text-slate-500 uppercase">Resilience Index</Text>
                                        <Text className="text-[8px] font-black text-orange-500">{data.pqcPosture}%</Text>
                                    </View>
                                    <View className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <View style={{ width: `${data.pqcPosture}%` }} className="h-full bg-orange-500" />
                                    </View>
                                </View>
                                <View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-[8px] font-black text-slate-500 uppercase">Hybrid Adoption</Text>
                                        <Text className="text-[8px] font-black text-blue-400">{data.pqcHybridPosture}%</Text>
                                    </View>
                                    <View className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <View style={{ width: `${data.pqcHybridPosture}%` }} className="h-full bg-blue-500" />
                                    </View>
                                </View>
                            </View>
                            <View className="items-center border-l border-slate-800 pl-6">
                                <Text className="text-5xl font-black text-white italic">{data.pqcPosture}</Text>
                                <Text className="text-[8px] font-black text-slate-500 uppercase text-center mt-1">Health Score</Text>
                            </View>
                        </View>
                    </View>

                    {/* 4. Inventory Data */}
                    <View className="bg-white mb-4 dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800">
                        <View className="flex-row items-center gap-3 mb-6">
                            <Layers size={20} color="#3b82f6" />
                            <Text className="font-black uppercase text-xs tracking-widest italic text-blue-500">Inventory</Text>
                        </View>
                        <InventoryItem label="TLS Certificates" value={data.inventory.tls} icon={<Lock size={12} color="#94a3b8" />} isDark={isDark} />
                        <InventoryItem label="Software Nodes" value={data.inventory.software} icon={<Cpu size={12} color="#94a3b8" />} isDark={isDark} />
                        <InventoryItem label="Active APIs" value={data.inventory.apis} icon={<Zap size={12} color="#94a3b8" />} isDark={isDark} />
                        <InventoryItem label="Web Interfaces" value={data.inventory.logins} icon={<Globe size={12} color="#94a3b8" />} isDark={isDark} />
                    </View>

                    {/* 5. CBOM Summary */}
                    <View className="bg-orange-50 dark:bg-orange-500/10 rounded-[2.5rem] p-8 border border-orange-100 dark:border-orange-500/20 items-center">
                        <View className="p-4 bg-orange-500 rounded-2xl mb-4">
                            <Layers size={28} color="white" />
                        </View>
                        <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                            {data.totalVulnerabilities.toLocaleString()}
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-1">
                            Vulnerable Components Detected in CBOM
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default ExecutivesReportingTab;