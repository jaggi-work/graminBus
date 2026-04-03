import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen({ children, style }) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[{ flex: 1, backgroundColor: '#0F1B2D' }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
