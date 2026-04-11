import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { 
    UserCog, CalendarClock, SearchCheck, ArrowRight, 
    FileText, ShieldCheck, Download, Activity, Database
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ReportingRegistry = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    const reportSections = [
        { 
            id: 'executive', 
            label: 'Executives Reporting', 
            path: '/executive', 
            icon: UserCog, 
            description: 'Strategic PQC migration status and high-level risk overview.',
            color: '#3b82f6', // blue
            bgColor: 'bg-blue-50 dark:bg-blue-500/10',
            borderColor: 'border-blue-100 dark:border-blue-500/20'
        },
        { 
            id: 'scheduled', 
            label: 'Scheduled Reporting', 
            path: '/scheduled', 
            icon: CalendarClock, 
            description: 'Automated compliance and audit trails, delivered periodicity.',
            color: '#f97316', // orange
            bgColor: 'bg-orange-50 dark:bg-orange-500/10',
            borderColor: 'border-orange-100 dark:border-orange-500/20'
        },
        { 
            id: 'ondemand', 
            label: 'On-Demand Reporting', 
            path: '/ondemand', 
            icon: SearchCheck, 
            description: 'Custom deep-dive reports for specific assets or vulnerabilities.',
            color: '#06b6d4', // cyan
            bgColor: 'bg-cyan-50 dark:bg-cyan-500/10',
            borderColor: 'border-cyan-100 dark:border-cyan-500/20'
        }
    ];

    return (
        <ScrollView 
            className="flex-1 bg-white dark:bg-[#0b0f19]"
            showsVerticalScrollIndicator={false}
        >
            <View 
                style={{ 
                    paddingTop: insets.top + 20, 
                    paddingBottom: insets.bottom + 40,
                    paddingHorizontal: 24 
                }}
            >
                {/* --- HEADER SECTION --- */}
                <View className="mb-12 items-center">
                    <View className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-3xl mb-6">
                        <FileText size={32} color="#f97316" />
                    </View>
                    <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic text-center">
                        Audit Reports
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 font-medium text-center mt-2 leading-5">
                        Access strategic insights, automated compliance logs, and custom infrastructure audits.
                    </Text>
                </View>

                {/* --- PRIMARY NAVIGATION CARDS --- */}
                <View className="space-y-6">
                    {reportSections.map((section) => (
                        <TouchableOpacity 
                            key={section.id}
                            onPress={() => router.push(section.path)}
                            activeOpacity={0.7}
                            className="bg-white mb-5 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 flex-row items-center shadow-sm"
                        >
                            {/* Dynamic Icon Container */}
                            <View className={`w-16 h-16 rounded-2xl flex items-center justify-center ${section.bgColor} border ${section.borderColor}`}>
                                <section.icon size={28} color={section.color} />
                            </View>

                            <View className="flex-1 ml-6">
                                <Text className="text-lg font-black text-slate-900 dark:text-white uppercase italic leading-none mb-1">
                                    {section.label}
                                </Text>
                                <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
                                    {section.description}
                                </Text>
                            </View>

                            <View className="ml-2 p-3 bg-slate-900 dark:bg-orange-500 rounded-2xl shadow-lg">
                                <ArrowRight size={16} color="white" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

export default ReportingRegistry;