import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '@/theme';

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8A7A80"
        {...props}
        style={[{
          minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: error ? '#B3261E' : colors.border, backgroundColor: colors.white,
          paddingHorizontal: 16, paddingVertical: props.multiline ? 12 : 0, fontFamily: fonts.body, fontSize: 16, color: colors.ink,
          textAlignVertical: props.multiline ? 'top' : 'center'
        }, props.style]}
      />
      {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: '#B3261E' }}>{error}</Text> : hint ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted }}>{hint}</Text> : null}
    </View>
  );
}
