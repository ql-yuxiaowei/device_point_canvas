<template>
  <div>
    <div v-if="text" :style="{ marginTop: '10px', marginBottom: '10px' }">{{ text }}</div>
    <div ref="videoRef" :style="{ width, height }" />
  </div>
</template>

<script>
const DEFAULT_WIDTH = "480px"
const DEFAULT_HEIGHT = "320px"
export default {
 props: {
    videoTrack: {
      type: Object,
      default: null,
    },
    audioTrack: {
      type: Object,
      default: null,
    },
    config: {
      type: Object,
      default: () => {}
    },
    isLocal: {
      type: Boolean,
      default: false
    },
    text: {
      type: [String, Number],
      default: ''
    },
    width: {
      type: String,
      default: DEFAULT_WIDTH
    },
    height: {
      type: String,
      default: DEFAULT_HEIGHT
    },
 },
 mounted() {
    this.videoTrack?.play(this.$refs.videoRef, this.config)
    if (!this.isLocal) {
      this.audioTrack?.play();
    }
 },
 watch: {
    videoTrack(track) {
      if (track && this.$refs.videoRef) {
        track.play(this.$refs.videoRef);
      }
    },
    audioTrack(track) {
      if (!this.isLocal) {
        track?.play()
      }
    },
 },
 unmounted() {
    this.videoTrack?.close();
    this.audioTrack?.close();
 },
}
</script>
