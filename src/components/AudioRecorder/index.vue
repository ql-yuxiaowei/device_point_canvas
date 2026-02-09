<template>
  <div class="audio-recorder">
    <!-- 只显示录音状态，无操作按钮和多余说明 -->
    <div class="recording-indicator" v-if="isRecording">
      <div class="recording-circle">
        <div class="recording-dot"></div>
        <div class="recording-text">{{ $t('正在录音') }}</div>
      </div>
      <div class="recording-timer">{{ formatTime(recordingProgress) }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AudioRecorder',
  data() {
    return {
      mediaRecorder: null,
      audioChunks: [],
      isRecording: false,
      recordedBlob: null,
      recordingStartTime: null,
      recordingProgress: 0,
      recordingTimer: null,
      audioContext: null,
      localStream: null,
      remoteStream: null,
      destinationNode: null
    }
  },
  mounted() {
    // 页面加载时自动请求麦克风权限
    this.requestMicrophonePermission()
  },
  beforeDestroy() {
    this.stopRecording()
    this.cleanupAudioContext()
  },
  methods: {
    async requestMicrophonePermission() {
      try {
        // 请求麦克风权限 - 禁用噪声抑制和回声消除以捕获环境音
        await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: false, 
            autoGainControl: true
          } 
        })
      } catch (error) {
        console.error('麦克风权限请求失败:', error)
      }
    },
    
    async startRecording(remoteAudioTrack = null) {
      try {
        let stream;
        
        if (remoteAudioTrack) {
          // 同时录制本地麦克风和远程音频（设备端声音）
          console.log('开始录制本地麦克风和远程音频（设备端声音）');
          stream = await this.createMixedAudioStream(remoteAudioTrack);
        } else {
          // 只录制本地麦克风
          console.log('开始录制本地麦克风');
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
              echoCancellation: false, 
              noiseSuppression: false, 
              autoGainControl: true
            } 
          })
        }
        
        // 创建MediaRecorder实例
        this.mediaRecorder = new MediaRecorder(stream)
        this.audioChunks = []
        this.isRecording = true
        this.recordingStartTime = Date.now()
        
        // 开始计时
        this.startRecordingTimer()
        
        // 监听数据可用事件
        this.mediaRecorder.addEventListener('dataavailable', (event) => {
          this.audioChunks.push(event.data)
        })
        
        // 监听录音结束事件
        this.mediaRecorder.addEventListener('stop', () => {
          // 停止所有音频轨道
          stream.getTracks().forEach(track => track.stop())
          
          // 创建音频Blob
          this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/wav' })
        })
        
        // 开始录音
        this.mediaRecorder.start()
      } catch (error) {
        console.error('录音失败:', error)
      }
    },
    
    async createMixedAudioStream(remoteAudioTrack) {
      try {
        // 创建 AudioContext 用于混合音频
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        
        // 获取本地麦克风流
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: false, 
            autoGainControl: true
          } 
        })
        
        // 获取远程音频流
        this.remoteStream = await this.createRemoteAudioStream(remoteAudioTrack);
        
        // 创建本地和远程音频的源节点
        const localSource = this.audioContext.createMediaStreamSource(this.localStream)
        const remoteSource = this.audioContext.createMediaStreamSource(this.remoteStream)
        
        // 创建目标节点用于混合音频
        this.destinationNode = this.audioContext.createMediaStreamDestination()
        
        // 将本地和远程音频都连接到目标节点
        localSource.connect(this.destinationNode)
        remoteSource.connect(this.destinationNode)
        
        // 返回混合后的流
        return this.destinationNode.stream
      } catch (error) {
        console.error('创建混合音频流失败:', error)
        throw error
      }
    },
    
    async createRemoteAudioStream(remoteAudioTrack) {
      try {
        // 尝试从 AgoraRTC 远程音频轨道获取媒体流
        // 方法1: 尝试获取媒体元素并提取流
        const mediaElement = remoteAudioTrack.getMediaElement?.();
        if (mediaElement) {
          const stream = mediaElement.captureStream?.() || mediaElement.mozCaptureStream?.();
          if (stream) {
            return stream;
          }
        }
        
        // 方法2: 尝试直接获取内部媒体流轨道
        const mediaStreamTrack = remoteAudioTrack._mediaStreamTrack;
        if (mediaStreamTrack) {
          const stream = new MediaStream([mediaStreamTrack]);
          return stream;
        }
        
        // 方法3: 尝试获取处理器
        const processor = remoteAudioTrack._processor;
        if (processor && processor._destination) {
          return processor._destination.stream;
        }
        
        throw new Error('无法获取远程音频流');
      } catch (error) {
        console.error('获取远程音频流失败:', error);
        throw error;
      }
    },
    
    cleanupAudioContext() {
      // 清理音频上下文和相关资源
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(track => track.stop())
        this.remoteStream = null
      }
      if (this.destinationNode) {
        this.destinationNode.disconnect()
        this.destinationNode = null
      }
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }
    },
    
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop()
        this.isRecording = false
        this.stopRecordingTimer()
        this.recordingProgress = 0
        // 清理音频上下文
        this.cleanupAudioContext()
      }
    },
    
    saveRecording() {
      if (!this.recordedBlob) {
        return
      }
      
      try {
        // 创建下载链接
        const url = URL.createObjectURL(this.recordedBlob)
        const link = document.createElement('a')
        
        // 设置文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `recording-${timestamp}.wav`
        
        // 设置链接属性
        link.href = url
        link.download = fileName
        
        // 模拟点击下载
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // 释放URL
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('保存失败:', error)
      }
    },
    
    startRecordingTimer() {
      this.recordingTimer = setInterval(() => {
        const elapsed = Date.now() - this.recordingStartTime
        // 进度条最多显示到99%
        this.recordingProgress = Math.min(Math.floor(elapsed / 1000) % 100, 99)
      }, 1000)
    },
    
    stopRecordingTimer() {
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer)
        this.recordingTimer = null
      }
    },
    
    formatTime(percentage) {
      if (!this.recordingStartTime) return '00:00'
      
      const elapsed = Date.now() - this.recordingStartTime
      const seconds = Math.floor(elapsed / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.audio-recorder {
  width: 100%;
  text-align: center;
  padding: 10px;
}

.recording-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.recording-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.recording-dot {
  width: 16px;
  height: 16px;
  background-color: #ef4554;
  border-radius: 50%;
  animation: recording-pulse 1.5s infinite;
}

.recording-text {
  color: #ef4554;
  font-size: 16px;
  font-weight: 500;
}

.recording-timer {
  font-size: 18px;
  color: #606266;
  font-family: monospace;
}

@keyframes recording-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>