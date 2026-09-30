// mobile/src/components/ErrorBoundary.tsx
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Card from './Card';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary] Caught render error:', error?.message, errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Something went wrong';
      const message =
        this.props.fallbackMessage ||
        'The application encountered an unexpected issue while rendering this view. You can safely retry or return to the previous screen.';

      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <View style={styles.iconCircle}>
              <Feather name="alert-triangle" size={32} color={Colors.error} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.btnRow}>
              <Button
                title="Try Again"
                onPress={this.handleReset}
                variant="primary"
                size="medium"
                icon={<Feather name="refresh-cw" size={16} color={Colors.white} />}
                style={styles.btn}
              />
            </View>

            {this.state.error && (
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              >
                <Text style={styles.toggleBtnText}>
                  {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
                </Text>
                <Feather
                  name={this.state.showDetails ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            )}

            {this.state.showDetails && this.state.error && (
              <View style={styles.detailsBox}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackText}>
                    {this.state.errorInfo.componentStack?.slice(0, 500)}
                  </Text>
                )}
              </View>
            )}
          </Card>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '80%',
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    width: '100%',
    marginBottom: 12,
  },
  btn: {
    width: '100%',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  toggleBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 6,
  },
  stackText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: 'monospace',
  },
});
