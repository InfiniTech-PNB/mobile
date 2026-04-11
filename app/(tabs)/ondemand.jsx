import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, TextInput, 
    ActivityIndicator, Alert, Modal, FlatList, useColorScheme 
} from 'react-native';
import { 
    Zap, ArrowRight, ArrowLeft, Database, FileCode, 
    Activity, ChevronDown, X, Globe, Mail, ShieldCheck
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";

const INITIAL_STATE = {
    reportName: "",
    targetDomainId: "",
    includeSections: { assets: true, cboms: true, scanResults: true },
    email: "admin@pnb-audit.com"
};

export default function OnDemandReportingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    // States
    const [domains, setDomains] = useState([]);
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(false);
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);

    // Load Domains (Registry Scope)
    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const res = await API.get("/reports/schedule-init");
                setDomains(res.data.domains || []);
            } catch (err) { console.error("Domain load failed", err); }
        };
        fetchDomains();
    }, []);

    const handleDomainSelect = (domain) => {
        setIsDomainModalOpen(false);
        setFormData(prev => ({ ...prev, targetDomainId: domain._id }));
    };

    // Instant Extraction Trigger
    const handleInstantTrigger = async () => {
        if (!formData.reportName.trim() || !formData.targetDomainId) {
            Alert.alert("Missing Parameters", "Please provide a report name and select a domain scope.");
            return;
        }

        setLoading(true);
        try {
            await API.post("/reports/on-demand", {
                scheduleName: formData.reportName,
                targetDomainId: formData.targetDomainId,
                includeSections: formData.includeSections,
                email: formData.email
            });

            Alert.alert("Dispatched", `Strategic Audit dispatched successfully to ${formData.email}`);
            setFormData(INITIAL_STATE);
        } catch (err) {
            Alert.alert("Extraction Failed", "Audit extraction failed. Ensure scan data exists for the selected domain.");
        } finally {
            setLoading(false);
        }
    };

    const currentDomainName = domains.find(d => d._id === formData.targetDomainId)?.domainName || "Consolidated Portfolio";

    return (
        <View className="flex-1 bg-white dark:bg-[#0b0f19]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 100 }}>
                    
                    {/* Header Nav */}
                    <View className="flex-row justify-between items-center mb-6">
                        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                            <ArrowLeft size={16} color="#94a3b8" />
                            <Text className="text-slate-400 text-[10px] font-black uppercase ml-2 italic">Registry</Text>
                        </TouchableOpacity>
                        <View className="flex-row items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20">
                            <Zap size={12} color="#f97316" />
                            <Text className="text-[8px] font-black text-orange-600 uppercase">High Priority</Text>
                        </View>
                    </View>

                    {/* Visual Banner */}
                    <View className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 mb-8 shadow-2xl relative overflow-hidden">
                        <View className="p-4 bg-orange-500 rounded-3xl self-start mb-6 shadow-lg shadow-orange-500/50">
                            <Zap size={28} color="white" />
                        </View>
                        <Text className="text-white text-3xl font-black italic uppercase tracking-tighter">On-Demand Auditor</Text>
                        <Text className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-widest">Instant Cryptographic Extraction</Text>
                    </View>

                    <View className="space-y-6">
                        {/* 1. Report Name */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Audit Subject Name</Text>
                            <TextInput 
                                className="bg-slate-50 dark:bg-slate-900 mb-4 p-5 rounded-2xl text-slate-900 dark:text-white font-black text-xs border border-slate-100 dark:border-slate-800"
                                placeholder="E.G. EMERGENCY COMPLIANCE CHECK"
                                placeholderTextColor="#64748b"
                                value={formData.reportName}
                                onChangeText={(t) => setFormData({...formData, reportName: t.toUpperCase()})}
                            />
                        </View>

                        {/* 2. Target Modules */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Included Intelligence Modules</Text>
                            <View className="flex-row mb-4 gap-2">
                                {[
                                    { id: 'assets', label: 'Assets', icon: Database },
                                    { id: 'cboms', label: 'CBOMs', icon: FileCode },
                                    { id: 'scanResults', label: 'Scans', icon: Activity }
                                ].map(mod => (
                                    <TouchableOpacity 
                                        key={mod.id}
                                        onPress={() => setFormData({
                                            ...formData, 
                                            includeSections: { ...formData.includeSections, [mod.id]: !formData.includeSections[mod.id] }
                                        })}
                                        className={`flex-1 flex-row items-center justify-center gap-2 p-4 rounded-2xl border ${formData.includeSections[mod.id] ? 'bg-orange-500 border-orange-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                    >
                                        <mod.icon size={12} color={formData.includeSections[mod.id] ? 'white' : '#64748b'} />
                                        <Text className={`text-[9px] font-black uppercase ${formData.includeSections[mod.id] ? 'text-white' : 'text-slate-500'}`}>{mod.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 3. Domain Dropdown */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Domain Scope</Text>
                            <TouchableOpacity 
                                onPress={() => setIsDomainModalOpen(true)}
                                className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row justify-between items-center"
                            >
                                <View className="flex-row items-center gap-3">
                                    <Globe size={16} color="#f97316" />
                                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">{currentDomainName}</Text>
                                </View>
                                <ChevronDown size={16} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* 4. Email Recipient */}
                        <View className="bg-[#0f172a] p-8 mt-4 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden">
                            <View className="flex-row items-center gap-3 mb-6">
                                <Mail size={18} color="#f97316" />
                                <Text className="text-white font-black uppercase text-[10px] tracking-widest">Instant Email Delivery</Text>
                            </View>
                            <TextInput 
                                className="bg-slate-800 p-4 rounded-xl text-white font-bold text-xs mb-8 border border-slate-700"
                                value={formData.email}
                                onChangeText={(t) => setFormData({...formData, email: t})}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            
                            <TouchableOpacity 
                                onPress={handleInstantTrigger}
                                disabled={loading}
                                className="bg-orange-500 p-6 rounded-2xl flex-row justify-center items-center gap-3 active:scale-95 shadow-lg shadow-orange-500/50"
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-black uppercase text-xs tracking-widest">Generate & Send Now</Text>
                                        <ArrowRight size={18} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Note */}
                        <View className="px-6 mt-4 py-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <Text className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter leading-tight text-center italic">
                                Note: On-demand reports utilize historical scan results stored in the neural registry. Ensure a successful scan exists for the selected scope.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* DOMAIN PICKER MODAL */}
            <Modal visible={isDomainModalOpen} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/60 justify-center items-center p-6" onPress={() => setIsDomainModalOpen(false)}>
                    <View className="w-full bg-white dark:bg-[#0b0f19] rounded-[2.5rem] overflow-hidden max-h-[60%] border border-slate-800 shadow-2xl">
                        <View className="p-6 bg-slate-900 flex-row justify-between items-center">
                            <Text className="text-white font-black uppercase text-xs tracking-widest">Select Extraction Scope</Text>
                            <TouchableOpacity onPress={() => setIsDomainModalOpen(false)}><X size={20} color="white" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={[{ _id: 'all', domainName: 'Consolidated Portfolio' }, ...domains]}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => handleDomainSelect(item)}
                                    className="p-5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800 flex-row items-center gap-4"
                                >
                                    <Globe size={16} color="#f97316" />
                                    <Text className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{item.domainName}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}