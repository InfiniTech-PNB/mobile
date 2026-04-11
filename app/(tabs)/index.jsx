import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Globe, Server, ShieldCheck, ShieldAlert, Loader2, Activity, Cpu, LayoutGrid, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import API from "../../services/api";

// COMPONENT: Restored ChartContainer
const ChartContainer = ({ title, children }) => (
    <View className="bg-gray-50 dark:bg-[#111827] p-6 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 mb-4 min-h-[300px]">
        <Text className="font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] mb-4 tracking-widest">{title}</Text>
        <View className="flex-1 w-full">{children}</View>
    </View>
);

// COMPONENT: Legend helper for pie charts
const ChartLegend = ({ data, colors }) => (
    <View className="mt-4 flex-row flex-wrap justify-between">
        {data?.map((item, i) => (
            <View key={i} className="flex-row items-center w-[48%] mb-2">
                <View
                    style={{ backgroundColor: item.color || colors[i % colors.length] }}
                    className="w-2.5 h-2.5 rounded-sm mr-2"
                />
                <Text className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex-1" numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-[9px] font-black dark:text-white ml-1">{item.value}</Text>
            </View>
        ))}
    </View>
);

// COMPONENT: Multi-Segment Pie for Distribution & PQC
const MultiSegmentPie = ({ data, total, colors, size = 140, strokeWidth = 16, centerLabel, centerSubLabel }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    let accumulatedValue = 0;

    // Use a default total of 1 if total is 0 to avoid Division by Zero
    const safeTotal = total || 1;

    return (
        <View className="items-center justify-center" style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Track (Ghost ring) */}
                <Circle 
                    cx={size / 2} 
                    cy={size / 2} 
                    r={radius} 
                    stroke="#e2e8f0" 
                    strokeWidth={strokeWidth} 
                    fill="none" 
                    opacity={0.2} 
                />
                
                {data?.map((item, index) => {
                    const val = parseFloat(item.value) || 0;
                    if (val === 0) return null;

                    const percentage = (val / safeTotal);
                    const strokeDashoffset = circumference * (1 - percentage);
                    
                    // Calculate rotation: start from top (-90deg) and add the sum of previous segments
                    const angle = (accumulatedValue / safeTotal) * 360 - 90;
                    
                    // Update accumulator for the next segment
                    accumulatedValue += val;

                    return (
                        <Circle 
                            key={index} 
                            cx={size / 2} 
                            cy={size / 2} 
                            r={radius}
                            stroke={item.color || colors[index % colors.length]} 
                            strokeWidth={strokeWidth} 
                            fill="none"
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round" // Rounded edges look more premium
                            transform={`rotate(${angle} ${size / 2} ${size / 2})`}
                        />
                    );
                })}
            </Svg>
            
            {/* Center Labels */}
            <View className="absolute items-center justify-center">
                <Text className="text-2xl font-black dark:text-white leading-tight">{centerLabel}</Text>
                <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{centerSubLabel}</Text>
            </View>
        </View>
    );
};

// COMPONENT: Restored StatCard
const StatCard = ({ label, val, icon: Icon, isDark }) => (
    <View className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-slate-800 p-5 rounded-[1.2rem] flex-row items-center space-x-4 mb-4 shadow-sm">
        <View className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
            <Icon size={20} color={isDark ? "#94a3b8" : "#475569"} />
        </View>
        <View>
            <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest">  {label}</Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white">  {val}</Text>
        </View>
    </View>
);

const HomeTab = () => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Only run if we have a user and a token string ready
            if (authLoading || !user?.token) {
                return; 
            }

            try {
                // setLoading(true); // Optional: uncomment if you want a loader on every re-focus
                const res = await API.get("/dashboard/stats");
                
                if (res.data) {
                    setStats(res.data);
                }
            } catch (err) {
                console.log("Fetch Error Status:", err.response?.status);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user?.token, authLoading]);

    if (authLoading) return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
            <ActivityIndicator color="#f59e0b" size="large" />
            <Text className="text-[10px] font-black text-gray-500 mt-4 uppercase tracking-widest">Verifying Identity...</Text>
        </View>
    );

    if (loading) return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
            <ActivityIndicator color="#f59e0b" size="large" />
            <Text className="text-[10px] font-black text-gray-500 mt-4 uppercase tracking-widest">Decrypting Dashboard...</Text>
        </View>
    );

    // 4. Fallback if the fetch failed (no stats returned)
    if (!stats) return (
        <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950 p-10">
            <ShieldAlert size={48} color="#ef4444" />
            <Text className="text-slate-900 dark:text-white font-black mt-4 text-center uppercase">System Offline</Text>
            <Text className="text-slate-500 text-center mt-2 text-xs">Could not sync with the security node. Please check your connection.</Text>
            <TouchableOpacity
                onPress={() => setLoading(true)} // This triggers the useEffect again
                className="mt-8 bg-slate-900 px-10 py-4 rounded-2xl"
            >
                <Text className="text-white font-black uppercase text-[10px]">Retry Connection</Text>
            </TouchableOpacity>
        </View>
    );

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    return (
        <ScrollView className="flex-1 bg-white dark:bg-[#0b0f19]" showsVerticalScrollIndicator={false}>
            <View className="p-6" style={{ paddingBottom: insets.bottom + 20 }}>

                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[3px] mb-2">Cyber Resilience Dashboard</Text>
                <Text className="text-4xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter">Overview</Text>

                {/* 1. TOP HUD */}
                <View className="mb-6">
                    <StatCard label="Total Assets" val={stats?.totalAssets} icon={LayoutGrid} isDark={isDark} />
                    <StatCard label="Public Web Apps" val={stats?.publicWebApps} icon={Globe} isDark={isDark} />
                    <StatCard label="APIs" val={stats?.apis} icon={Activity} isDark={isDark} />
                    <StatCard label="Servers" val={stats?.servers} icon={Server} isDark={isDark} />
                    <StatCard label="Expiring Certs" val={stats?.expiringCerts} icon={ShieldAlert} isDark={isDark} />
                    <StatCard label="High Risk Assets" val={stats?.highRiskAssets} icon={ShieldAlert} isDark={isDark} />
                </View>

                {/* 2. Asset Type Distribution */}
                <ChartContainer title="Asset Type Distribution">
                    <View className="items-center py-4">
                        <MultiSegmentPie data={stats.typeDistribution} total={stats.totalAssets} colors={COLORS} centerLabel="84%" centerSubLabel="Cloud" />
                    </View>
                    <ChartLegend data={stats.typeDistribution} colors={COLORS} />
                </ChartContainer>

                {/* 3. Asset Risk Distribution */}
                <ChartContainer title="Asset Risk Distribution">
                    <View className="space-y-6 mt-4">
                        {stats.riskDistribution?.map((item, i) => (
                            <View key={i} className="mb-4">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-[10px] font-black uppercase text-slate-500">{item.name}</Text>
                                    <Text className="text-[10px] font-black dark:text-white">{item.value}</Text>
                                </View>
                                <View className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-md overflow-hidden">
                                    <View style={{ width: `${(item.value / stats.totalAssets) * 100}%`, backgroundColor: item.name === 'High' ? '#ef4444' : item.name === 'Medium' ? '#f59e0b' : '#10b981' }} className="h-full" />
                                </View>
                            </View>
                        ))}
                    </View>
                </ChartContainer>

                {/* 4. Cert Expiry Timeline */}
                <View className="bg-gray-50 dark:bg-[#111827] p-6 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 mb-4">
                    <Text className="font-black text-slate-400 uppercase text-[10px] mb-8 tracking-widest">Cert Expiry Timeline</Text>
                    <View className="space-y-6">
                        {stats.certExpiry?.map((item, i) => (
                            <View key={i}>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-[10px] font-black uppercase text-slate-500">{item.name}</Text>
                                    <Text className="text-[10px] font-black dark:text-white">{item.value}</Text>
                                </View>
                                <View className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <View style={{ width: `${(item.value / (stats.totalAssets || 1)) * 100}%`, backgroundColor: item.name.includes('0-30') ? '#ef4444' : item.name.includes('30-90') ? '#f59e0b' : '#10b981' }} className="h-full rounded-full" />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* SECURITY HYGIENE SECTION */}
                <View className="pt-4 mb-4">
                    <Text className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-6">Security Hygiene & Audit Coverage</Text>

                    <ChartContainer title="Inventory Audit Status">
                        <View className="items-center py-4">
                            <MultiSegmentPie
                                data={stats.auditCoverage}
                                total={stats.totalAssets}
                                colors={COLORS}
                                centerLabel={`${stats.totalAssets > 0 ? Math.round((stats.scannedAssetsCount / stats.totalAssets) * 100) : 0}%`}
                                centerSubLabel="Coverage"
                            />
                        </View>
                        <ChartLegend data={stats.auditCoverage} colors={COLORS} />
                    </ChartContainer>

                    <ChartContainer title="PQC Adoption (Scanned Assets)">
                        <View className="items-center py-4">
                            <MultiSegmentPie
                                data={stats.pqcAdoption}
                                total={stats.pqcAdoption[0].value + stats.pqcAdoption[1].value + stats.pqcAdoption[2].value || 1}
                                colors={COLORS}
                                centerLabel={stats.pqcReadyAssets || 0}
                                centerSubLabel="Safe Nodes"
                            />
                        </View>
                        <ChartLegend data={stats.pqcAdoption} colors={COLORS} />
                    </ChartContainer>
                </View>

                {/* 7. IP Version Breakdown */}
                <ChartContainer title="IP Version Breakdown">
                    <View className="items-center py-4">
                        <MultiSegmentPie
                            data={[{ name: 'IPv4 Global', value: stats.ipBreakdown?.ipv4 || 0, color: '#3b82f6' }, { name: 'IPv6 Network', value: stats.ipBreakdown?.ipv6 || 0, color: isDark ? '#1e293b' : '#e2e8f0' }]}
                            total={100}
                            colors={['#3b82f6', '#1e293b']}
                            centerLabel={`${stats.ipBreakdown?.ipv4}%`}
                            centerSubLabel="IPv4 Global"
                        />
                    </View>
                    <ChartLegend
                        data={[{ name: 'IPv4 Global', value: `${stats.ipBreakdown?.ipv4}%`, color: '#3b82f6' }, { name: 'IPv6 Network', value: `${stats.ipBreakdown?.ipv6}%`, color: isDark ? '#1e293b' : '#e2e8f0' }]}
                        colors={['#3b82f6', '#1e293b']}
                    />
                </ChartContainer>

                {/* 8. Asset Inventory */}
                <View className="bg-black dark:bg-[#111827] rounded-[1.5rem] border border-slate-800 overflow-hidden mb-4">
                    <View className="p-5 border-b border-slate-800"><Text className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Asset Inventory</Text></View>
                    <View className="p-4">
                        {stats.recentAssets?.map((a, i) => (
                            <View key={i} className="flex-row justify-between py-4 border-b border-white/5">
                                <View className="flex-1"><Text className="text-blue-400 font-bold text-xs">{a.host}</Text><Text className="text-slate-500 text-[9px] font-mono">{a.ip}</Text></View>
                                <View className="items-end"><Text className="text-slate-400 text-[9px] mb-1 font-bold uppercase">{a.assetType}</Text>
                                    <Text className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${a.risk === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{a.risk}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 9. Crypto Overview */}
                <View className="bg-gray-50 dark:bg-[#111827] rounded-[1.5rem] border border-gray-100 dark:border-slate-800 p-6 mb-4">
                    <Text className="font-black text-slate-400 uppercase text-[10px] mb-6 tracking-widest italic">Crypto & Security Overview</Text>
                    {stats.cryptoOverview?.map((item, i) => (
                        <View key={i} className="flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 mb-3">
                            <View className="flex-row items-center space-x-3">
                                <View className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 items-center justify-center"><Cpu size={16} color={item.isPqc ? "#10b981" : "#64748b"} /></View>
                                <View><Text className="text-[10px] font-black dark:text-white uppercase">{item.asset}</Text><Text className={`text-[8px] font-bold ${item.isPqc ? 'text-emerald-500' : 'text-slate-500'}`}>{item.displayAlgo}</Text></View>
                            </View>
                            <View className="items-end"><Text className="text-[9px] font-black text-slate-400 uppercase">{item.isPqc ? 'PQC-SAFE' : `${item.keyLength}-bit`}</Text><Text className="text-[8px] text-slate-600 font-bold uppercase">{item.tls || "TLS 1.3"}</Text></View>
                        </View>
                    ))}
                </View>

            </View>
        </ScrollView>
    );
};

export default HomeTab;