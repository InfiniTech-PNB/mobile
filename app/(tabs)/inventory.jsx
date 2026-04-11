import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, TextInput,
    ActivityIndicator, LayoutAnimation, Platform, UIManager, Modal, FlatList, useColorScheme
} from 'react-native';
import {
    Globe, Server, Search, Loader2, Activity, Cpu,
    Network, ChevronDown, ChevronUp, Zap, LayoutGrid, X
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- SUB-COMPONENTS ---

const InfoRow = ({ label, value, isMono, isBlue }) => (
    <View className="flex-row justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 last:border-0">
        <Text className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{label}</Text>
        <Text className={`text-[10px] font-bold ${isMono ? 'font-mono' : ''} ${isBlue ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'}`}>
            {value}
        </Text>
    </View>
);

const AssetCard = memo(({ item, isExpanded, onToggle, detailedServices }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const services = detailedServices || item.services || [];

    // Theme-aware inline styles for stability
    const cardStyles = {
        marginBottom: 16,
        marginHorizontal: 24,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        // Dark: Slate-800, Light: Slate-100
        borderColor: isExpanded ? '#3b82f6' : (isDark ? '#1e293b' : '#f1f5f9'),
        // Dark: Slate-900, Light: White
        backgroundColor: isExpanded
            ? (isDark ? '#1e293b' : '#f8fafc')
            : (isDark ? '#0f172a' : '#ffffff'),
        elevation: isExpanded ? 5 : 0,
    };

    return (
        <View style={cardStyles}>
            <TouchableOpacity
                onPress={() => onToggle(item._id)}
                activeOpacity={0.7}
                className="p-6 flex-row items-center justify-between"
            >
                <View className="flex-row items-center flex-1">
                    <View className="p-3 bg-slate-900 dark:bg-black rounded-2xl">
                        <Activity size={18} color="#3b82f6" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight" numberOfLines={1}>
                            {item.host}
                        </Text>
                        <Text className="text-[9px] font-bold text-slate-400 mt-0.5">
                            {item.ip} • <Text className="text-blue-500 uppercase">{item.assetType || 'NODE'}</Text>
                        </Text>
                    </View>
                </View>
                <View className={`p-2 rounded-full ${isExpanded ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {isExpanded ? <ChevronUp size={16} color="white" /> : <ChevronDown size={16} color={isDark ? "#94a3b8" : "#64748b"} />}
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View className="px-6 pb-8">
                    <View className="h-[1px] bg-slate-100 dark:bg-slate-800 mb-6" />
                    <View className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Cpu size={14} color="#3b82f6" />
                            <Text className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Node Metadata</Text>
                        </View>
                        <InfoRow label="Classification" value={item.assetType || 'N/A'} />
                        <InfoRow label="Mapped IP" value={item.ip || '0.0.0.0'} isMono />
                        <InfoRow label="Active Stack" value={`${services.length} PORTS`} />
                        <InfoRow label="Protocol" value={services[0]?.protocolName || 'NONE'} isBlue />
                    </View>

                    <View className="flex-row items-center gap-2 mb-4 px-1">
                        <Network size={14} color="#3b82f6" />
                        <Text className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Topography</Text>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                        {services.length > 0 ? services.map((svc, sIdx) => (
                            <View key={sIdx} className="w-[48%] bg-slate-900 dark:bg-black p-3 rounded-2xl flex-row items-center gap-3 border border-slate-800">
                                <View className="p-2 bg-blue-500/10 rounded-lg">
                                    <Zap size={12} color="#10b981" />
                                </View>
                                <View>
                                    <Text className="text-[9px] font-black text-white uppercase">{svc.protocolName || 'TCP'}</Text>
                                    <Text className="text-[8px] font-mono text-slate-500">{svc.port}</Text>
                                </View>
                            </View>
                        )) : (
                            <Text className="text-[10px] text-slate-400 italic py-2">No active services detected.</Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
});

// Move this OUTSIDE the main component
const ListHeader = memo(({ insets, isDark, currentDomainName, setIsDropdownOpen, searchTerm, setSearchTerm, filteredCount, selectedDomain }) => (
    <View style={{ paddingTop: insets.top }}>
        <View className="px-6 mb-5 flex-row items-center gap-5">
            <View className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-3xl">
                <Server size={28} color="#3b82f6" />
            </View>
            <View>
                <Text className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Global Inventory</Text>
                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Network Endpoint Discovery</Text>
            </View>
        </View>

        <View className="px-6 py-4 bg-white dark:bg-[#0b0f19] border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row gap-3">
                <TouchableOpacity
                    onPress={() => setIsDropdownOpen(true)}
                    className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-900 px-4 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800"
                >
                    <Globe size={14} color="#3b82f6" />
                    <Text className="flex-1 ml-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300" numberOfLines={1}>{currentDomainName}</Text>
                    <ChevronDown size={14} color="#94a3b8" />
                </TouchableOpacity>

                <View className="flex-1 relative justify-center">
                    <Search className="absolute left-3 z-10" size={14} color="#94a3b8" />
                    <TextInput
                        placeholder="SEARCH IP..."
                        placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="bg-slate-50 dark:bg-slate-900 pl-9 pr-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800"
                    />
                </View>
            </View>
        </View>

        {selectedDomain && (
            <View className="px-8 pt-6 pb-4 flex-row items-center gap-2">
                <LayoutGrid size={16} color="#3b82f6" />
                <Text className="text-sm font-black text-slate-900 dark:text-white uppercase italic">Detected Assets ({filteredCount})</Text>
            </View>
        )}
    </View>
));

export default function AssetInventoryScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [domains, setDomains] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState("");
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedAssetId, setExpandedAssetId] = useState(null);
    const [detailedServices, setDetailedServices] = useState({});
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const res = await API.get("/domains");
                setDomains(res.data || []);
            } catch (err) { console.error("Error fetching domains:", err); }
        };
        fetchDomains();
    }, []);

    const handleDomainSelect = async (domain) => {
        setIsDropdownOpen(false);
        setSelectedDomain(domain._id);
        setLoading(true);
        try {
            const res = await API.get(`/asset-discovery/${domain._id}/assets`);
            setAssets(res.data.assets || []);
            setExpandedAssetId(null);
        } catch (err) { setAssets([]); } finally { setLoading(false); }
    };

    const toggleAssetExpansion = useCallback(async (assetId) => {
        if (Platform.OS === 'ios' || (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental)) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setExpandedAssetId(prev => prev === assetId ? null : assetId);
        if (!detailedServices[assetId]) {
            try {
                const res = await API.get(`/services/${assetId}/services`);
                setDetailedServices(prev => ({ ...prev, [assetId]: res.data }));
            } catch (err) { console.error(err); }
        }
    }, [detailedServices]);

    const filteredAssets = assets.filter(a =>
        a.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.ip?.includes(searchTerm)
    );

    const currentDomainName = domains.find(d => d._id === selectedDomain)?.domainName || "Select Domain";

    return (
        <View className="flex-1 bg-white dark:bg-[#0b0f19]">
            <FlatList
                data={filteredAssets}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <AssetCard
                        item={item}
                        isExpanded={expandedAssetId === item._id}
                        onToggle={toggleAssetExpansion}
                        detailedServices={detailedServices[item._id]}
                    />
                )}
                ListHeaderComponent={
                    <ListHeader
                        insets={insets}
                        isDark={isDark}
                        currentDomainName={currentDomainName}
                        setIsDropdownOpen={setIsDropdownOpen}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredCount={filteredAssets.length}
                        selectedDomain={selectedDomain}
                    />
                }
                ListEmptyComponent={!loading && (
                    <View className="py-20 items-center opacity-30 px-10">
                        <Search size={60} color="#94a3b8" />
                        <Text className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] mt-6 text-center">
                            {selectedDomain ? "No assets found" : "Select domain to begin lookup"}
                        </Text>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            {loading && (
                <View className="absolute inset-0 bg-white/50 dark:bg-black/50 justify-center items-center">
                    <Loader2 size={40} color="#3b82f6" className="animate-spin" />
                </View>
            )}

            <Modal visible={isDropdownOpen} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/60 justify-center items-center p-6" activeOpacity={1} onPress={() => setIsDropdownOpen(false)}>
                    <View className="w-full bg-white dark:bg-[#0b0f19] rounded-[2.5rem] overflow-hidden max-h-[60%] border border-slate-100 dark:border-slate-800">
                        <View className="p-6 bg-slate-900 flex-row justify-between items-center">
                            <Text className="text-white font-black uppercase text-xs">Network Domains</Text>
                            <TouchableOpacity onPress={() => setIsDropdownOpen(false)}><X size={20} color="white" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={domains}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => {
                                const active = selectedDomain === item._id;
                                return (
                                    <TouchableOpacity
                                        onPress={() => handleDomainSelect(item)}
                                        style={{
                                            padding: 20,
                                            marginBottom: 8,
                                            borderRadius: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: active ? '#3b82f6' : (isDark ? '#1e293b' : '#f8fafc'),
                                            borderWidth: 1,
                                            borderColor: isDark ? '#334155' : '#f1f5f9'
                                        }}
                                    >
                                        <Globe size={16} color={active ? 'white' : '#3b82f6'} />
                                        <Text style={{
                                            marginLeft: 16,
                                            fontSize: 12,
                                            fontWeight: '900',
                                            color: active ? 'white' : (isDark ? '#f1f5f9' : '#334155')
                                        }}>
                                            {item.domainName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}