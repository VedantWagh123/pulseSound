import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AdvancedDotVortex from './AdvancedDotVortex';
import AuroraFlowVisualizer from './AuroraFlowVisualizer';

/**
 * VisualizerController
 * Hosts the two alternating premium visualizer styles:
 * Style 0: Advanced Centered Audio-Reactive Dot Vortex & Radial Matrix
 * Style 1: Ethereal Aurora Flow Northern Lights Visualizer
 * Alternates seamlessly on successive 10-second animation cycles.
 * Provides a rich cosmic backdrop so the screen is never blank.
 */
export const VisualizerController = React.memo(({
  width,
  height,
  artworkSize,
  isPlaying,
  audioEnergy = 0.2,
  bassEnergy = 0.2,
  midEnergy = 0.2,
  trebleEnergy = 0.2,
  beatCount = 0,
  hasVideo = false,
  fullscreenProgress,
  activeStyle = 0,
}) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Permanent Cosmic Ambient Base Layer: GUARANTEES SCREEN IS NEVER BLANK */}
      {!hasVideo && (
        <LinearGradient
          colors={['#08081A', '#130B29', '#060714']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Style 0: Advanced Dot Vortex (First Animation) */}
      {activeStyle === 0 && (
        <AdvancedDotVortex
          width={width}
          height={height}
          artworkSize={artworkSize}
          isPlaying={isPlaying}
          audioEnergy={audioEnergy}
          bassEnergy={bassEnergy}
          midEnergy={midEnergy}
          trebleEnergy={trebleEnergy}
          beatCount={beatCount}
          hasVideo={hasVideo}
          fullscreenProgress={fullscreenProgress}
        />
      )}

      {/* Style 1: Aurora Flow Visualizer (New Premium Animation) */}
      {activeStyle === 1 && (
        <AuroraFlowVisualizer
          width={width}
          height={height}
          isPlaying={isPlaying}
          audioEnergy={audioEnergy}
          bassEnergy={bassEnergy}
          midEnergy={midEnergy}
          trebleEnergy={trebleEnergy}
          beatCount={beatCount}
          hasVideo={hasVideo}
          fullscreenProgress={fullscreenProgress}
        />
      )}
    </View>
  );
});

export default VisualizerController;
