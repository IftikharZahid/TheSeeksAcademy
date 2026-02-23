import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { scale } from '../utils/responsive';

interface FeeSlipProps {
    serialNo: string;
    date: string;
    studentName: string;
    className: string;
    monthlyFee: string;
    otherCharges: string;
    receivedBy: string;
}

export const FeeSlipTemplate: React.FC<FeeSlipProps> = ({
    serialNo,
    date,
    studentName,
    className,
    monthlyFee,
    otherCharges,
    receivedBy,
}) => {
    return (
        <View style={styles.container}>
            {/* Top Row - S No., Logo, Believe You Can */}
            <View style={styles.topRow}>
                <Text style={styles.serialNoLabel}>S No. <Text style={styles.serialNoValue}>{serialNo}</Text></Text>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/academy-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.tagline}>Believe You Can !</Text>
            </View>

            {/* Address Line */}
            <View style={styles.addressContainer}>
                <View style={styles.orangeLine} />
                <Text style={styles.addressText}>1/D. Mazhar Aloom Road, Fort Abbas Ph: 0348 7000302</Text>
                <View style={styles.orangeLine} />
            </View>

            {/* Fee Slip Title with Date */}
            <View style={styles.titleRow}>
                <View style={styles.feeSlipBadge}>
                    <Text style={styles.feeSlipText}>Fee Slip</Text>
                </View>
                <Text style={styles.dateLabel}>Date: <Text style={styles.dateValue}>{date}</Text></Text>
            </View>

            {/* Student Name */}
            <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Student Name:</Text>
                <View style={styles.fieldLine}>
                    <Text style={styles.fieldValue}>{studentName}</Text>
                </View>
            </View>

            {/* Monthly Fee and Class */}
            <View style={styles.dualFieldRow}>
                <View style={styles.dualFieldLeft}>
                    <Text style={styles.fieldLabel}>Monthly Fee:</Text>
                    <View style={styles.fieldLineShort}>
                        <Text style={styles.fieldValue}>{monthlyFee}</Text>
                    </View>
                </View>
                <View style={styles.dualFieldRight}>
                    <Text style={styles.fieldLabel}>Class:</Text>
                    <View style={styles.fieldLineShort}>
                        <Text style={styles.fieldValue}>{className}</Text>
                    </View>
                </View>
            </View>

            {/* Other Charges */}
            <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Other Charges:</Text>
                <View style={styles.fieldLine}>
                    <Text style={styles.fieldValue}>{otherCharges}</Text>
                </View>
            </View>

            {/* Received By and Signature */}
            <View style={styles.signatureRow}>
                <View style={styles.receivedByContainer}>
                    <Text style={styles.fieldLabel}>Received By:</Text>
                    <View style={styles.receivedByLine}>
                        <Text style={styles.fieldValue}>{receivedBy}</Text>
                    </View>
                </View>
                <View style={styles.signatureContainer}>
                    <Text style={styles.signatureLabel}>Signature:</Text>
                    <Image
                        source={require('../../assets/signature.png')}
                        style={styles.signatureImage}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Footer Disclaimer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    This document has been generated online and does not require stamp verification.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        padding: scale(20),
        width: '100%',
    },
    // Top Row
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: scale(10),
    },
    serialNoLabel: {
        fontFamily: 'System',
        fontStyle: 'italic',
        fontSize: scale(14),
        color: '#1a1a1a',
    },
    serialNoValue: {
        fontWeight: '600',
    },
    logoContainer: {
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: scale(180),
        height: scale(60),
    },
    tagline: {
        fontFamily: 'System',
        fontStyle: 'italic',
        fontSize: scale(14),
        color: '#c41e3a',
        fontWeight: '500',
    },
    // Address
    addressContainer: {
        alignItems: 'center',
        marginBottom: scale(12),
    },
    orangeLine: {
        height: 2,
        width: '100%',
        backgroundColor: '#f5a623',
    },
    addressText: {
        fontSize: scale(13),
        fontWeight: '700',
        color: '#1a1a1a',
        paddingVertical: scale(8),
        textAlign: 'center',
    },
    // Title Row
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(20),
        gap: scale(30),
    },
    feeSlipBadge: {
        backgroundColor: '#1e5aa8',
        paddingHorizontal: scale(20),
        paddingVertical: scale(6),
        borderRadius: scale(4),
    },
    feeSlipText: {
        color: '#ffffff',
        fontSize: scale(16),
        fontWeight: '700',
    },
    dateLabel: {
        fontSize: scale(14),
        color: '#1a1a1a',
        fontWeight: '500',
    },
    dateValue: {
        fontWeight: '700',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    // Field Rows
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: scale(16),
    },
    fieldLabel: {
        fontSize: scale(14),
        fontWeight: '700',
        color: '#1a1a1a',
    },
    fieldLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        marginLeft: scale(8),
        paddingBottom: scale(2),
    },
    fieldValue: {
        fontSize: scale(14),
        color: '#1a1a1a',
        fontWeight: '500',
    },
    // Dual Field Row
    dualFieldRow: {
        flexDirection: 'row',
        marginBottom: scale(16),
    },
    dualFieldLeft: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flex: 1,
    },
    dualFieldRight: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flex: 1,
        marginLeft: scale(20),
    },
    fieldLineShort: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        marginLeft: scale(8),
        paddingBottom: scale(2),
    },
    // Signature Row
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: scale(20),
        marginBottom: scale(16),
    },
    receivedByContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    receivedByLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        marginLeft: scale(8),
        width: scale(80),
        paddingBottom: scale(2),
    },
    signatureContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    signatureLabel: {
        fontSize: scale(14),
        fontWeight: '700',
        color: '#1a1a1a',
    },
    signatureImage: {
        width: scale(80),
        height: scale(40),
        marginLeft: scale(8),
    },
    // Footer
    footer: {
        marginTop: scale(16),
        paddingTop: scale(12),
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    footerText: {
        fontSize: scale(11),
        fontStyle: 'italic',
        color: '#c41e3a',
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});
