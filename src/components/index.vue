<template>
  <div class="container">
    <section class="flex-j-sb" style="flex:1;">
      <!-- MQTT测试Demo -->
      <div style="margin: 10px 20px; padding: 10px; background: #e8f5e9; border-radius: 4px;">
        <div style="font-weight: bold; margin-bottom: 10px;">MQTT服务器</div>
        <div style="display: flex; flex-flow: column nowrap; align-items: center;justify-content: center;">
          <div style="margin-bottom: 20px;">
            uid: <el-input v-model="currentUid" placeholder="请输入UID" @change="changeUid" style="width: 200px; margin-right: 10px;"></el-input>
          </div>
          <div style="margin-bottom: 20px;">
            addr: <el-input v-model="mqttConfig.host" placeholder="请输入mqtt服务器地址" style="width: 200px; margin-right: 10px;"></el-input>
          </div>
          <div style="margin-bottom: 20px;">
            subTime: <el-input v-model="mqttConfig.subTime" placeholder="请输入订阅时长" style="width: 200px; margin-right: 10px;">
              <template slot="append">s</template>
            </el-input>
          </div>
          <div style="margin-bottom: 20px;">
            <el-button type="success" @click="mqttConnect">Mqtt连接</el-button>
            <el-button type="danger" @click="mqttDisconnect" :disabled="!mqttConnected">Mqtt断开</el-button>
          </div>
        </div>
      </div>
      <el-card class="box-card mb10" id="chartsMax" style="height: 790px; position: relative">
        <div slot="header" class="clearfix" style="display: flex;justify-content: space-between;">
          <span>轨迹监控</span>
        </div>
        <el-row style="background: #fff; text-align: center; display: flex; flex-flow: column nowrap; align-items: center">
          <div style="width: 100%; height: 40px; line-height: 40px; text-align: center; font-size: 20px">
            <span style="color: red; font-size: 40px">{{ this.TrackDataLen }}</span> 人
          </div>
          <div :style="{ width: '800px', position: 'absolute', top: '10px', 'textAlign': 'right', margin: '0 auto', 'fontSize': '18px', color: 'gray' }">
            每一个小方格，为50*50cm
          </div>
          <canvas ref="myCanvas" :width="drawWidth" :height="drawHeight" />
          <el-row style="margin-top: 10px">
            <i class="dotClass" :style="{ float: 'left', backgroundColor: dotColor }"></i>
          </el-row>
          <div style="margin-top: 10px">
            <el-button type="primary" plain @click="openAreaDialog" style="position:relative;">
              编辑区域
            </el-button>
          </div>
        </el-row>
      </el-card>
      
      <el-card class="box-card mb10" id="chartsMax" style="flex: 1; height: 790px; position: relative">
        <div slot="header" class="clearfix" style="display: flex;justify-content: space-between;">
          <span>功能属性</span>
          <el-button type="primary" size="small" @click="saveRadarProps">保存</el-button>
        </div>
        <el-table ref="multipleTable" :data="radarPropArr" height="700px">
          <el-table-column label="key" align="center" prop="key" />
          <el-table-column label="value" class-name="column-bg-color-editable" width="300" show-overflow-tooltip>
            <template scope="scope">
              <div class="input-box">
                <el-input size="small" v-model="scope.row.value" :disabled="['fall_param', 'heart_breath_param', 'accelera', 'wifi_rssi'].includes(scope.row.key)"></el-input>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <!-- 方案2.0 编辑区域 -->
    <el-dialog title="编辑区域" :visible.sync="AreaDialog.open" width="1150px" append-to-body class="edit-area">
      <div v-loading="AreaDialog.loading" style="display:flex;flex-flow:row nowrap;">
        <section>
          <el-row type="flex">
            <el-radio-group v-model="areaType" @input="gridClick">
              <el-radio-button  v-for="(item, index) in baseList.slice(1,6)" :key="index"
                :label="item.type" :disabled="item.disabled" :id="item.id">
                {{item.title}}
                <i v-if="!!item.badge" class="el-icon-warning" style="position: absolute;top: 0;right: 2px;font-size: 18px;color: #f6ab28;"></i>
              </el-radio-button>
            </el-radio-group>
            <div style="flex:1;display:flex;align-items:center;height:40px;margin-left:15px;">
              <img style="width: 14px; height: 14px" src="@/assets/chartBed/tips.png" />
              <span style="font-size:14px;color:gray;word-break:auto-phrase">滑动绘制区域</span>
            </div>
          </el-row>
          <el-row>
            <canvas ref="myCanvas2" :width="drawWidth" :height="drawHeight" @mousedown="onMouseDown"
              @mousemove="onMouseMove" @mouseup="onMouseUp" @dblclick="onLongtap" />
          </el-row>
        </section>
        <section style="min-width:340px;position:relative;display:flex;flex-flow:column nowrap;">
          <el-row style="margin-top:40px;padding:0 10px;">
            <p style="font-size:18px;font-weight:bold;">区域尺寸</p>
            <p style="font-size:14px;color:gray;margin:10px 0;">宽度</p>
            <el-input type="number" v-model="sizeWidth" @blur="sizeChange" step="10" @change="(val) => sizeWidth=Math.round(val/10)*10" :disabled="!currentType">
              <template slot="prepend"><img style="width: 14px; height: 14px" src="@/assets/chartBed/area-width.png" /></template>
              <template slot="append">CM</template>
            </el-input>
            <p style="font-size:14px;color:gray;margin:10px 0;">长度</p>
            <el-input type="number" v-model="sizeHeight" @blur="sizeChange" step="10" @change="(val) => sizeHeight=Math.round(val/10)*10" :disabled="!currentType">
              <template slot="prepend"><img style="width: 14px; height: 14px" src="@/assets/chartBed/area-height.png" /></template>
              <template slot="append">CM</template></el-input>
          </el-row>
          <div style="position:absolute;bottom:0;left:50%;text-align: center;transform:translate(-50%,0%);">
            <el-button @click="handleCancleArea">取消</el-button>
            <el-button type="primary" @click="handleAddArea" id="area-save">保存</el-button>
          </div>
        </section>
      </div>
    </el-dialog>
    
    <!-- 区域图标 -->
    <div>
      <img ref="posStand0" src="@/assets/images/posStand0.png" style="display: none" width="25" height="25" />
      <img ref="posStand1" src="@/assets/images/posStand1.png" style="display: none" width="25" height="25" />
      <img ref="posStand2" src="@/assets/images/posStand2.png" style="display: none" width="25" height="25" />
      <img ref="posWaker0" src="@/assets/images/posWaker0.png" style="display: none" width="25" height="25" />
      <img ref="posWaker1" src="@/assets/images/posWaker1.png" style="display: none" width="25" height="25" />
      <img ref="posWaker2" src="@/assets/images/posWaker2.png" style="display: none" width="25" height="25" />
      <img ref="posDown1" src="@/assets/images/posDown1.png" style="display: none" width="25" height="25" />
      <img ref="posSit0" src="@/assets/images/posSit0.png" style="display: none" width="25" height="25" />
      <img ref="posSit1" src="@/assets/images/posSit1.png" style="display: none" width="25" height="25" />
      <img ref="posSit2" src="@/assets/images/posSit2.png" style="display: none" width="25" height="25" />
      <img ref="posDown2" src="@/assets/images/posDown2.png" style="display: none" width="25" height="25" />
      <img ref="posLying0" src="@/assets/images/posLying0.png" style="display: none" width="25" height="25" />
      <img ref="posLying1" src="@/assets/images/posLying1.png" style="display: none" width="25" height="25" />
      <img ref="posLying2" src="@/assets/images/posLying2.png" style="display: none" width="25" height="25" />
      <img ref="posFan0" src="@/assets/images/posFan.png" style="display: none" width="25" height="25" />
      <img ref="posPet0" src="@/assets/images/posPet.png" style="display: none" width="25" height="25" />
      <img ref="posSit3" src="@/assets/images/posSit3.png" style="display: none" width="25" height="25" />
      <img ref="posSit4" src="@/assets/images/posSit4.png" style="display: none" width="25" height="25" />
    </div>
  </div>
</template>

<script>
import { Message, MessageBox } from "element-ui";
import imgRadar from "@/assets/images/radar.png";
import mqtt from 'mqtt/dist/mqtt'
import axios from 'axios'
import { splitArray, extractTrackData } from "./index";

export default {
  name: "RoomDetails",
  data() {
    return {
      drawerWidth: 800,
      drawerHeight: 700,
      menuType: "",
      areaType: "",
      dotColor: 'gray',
      isHasPeople: false,
      isNo16time: null,
      timer: null,
      TrackData: [],
      TrackDataLen: 0,
      newTrackData: [],
      CornerData: {
        installType: "0",
        height: "",
        leftBorder: 0,
        rightBorder: 0,
        frontBorder: 0,
        backBorder: 0,
      },
      AreaData: [],
      AreaDialog: {
        loading: false,
        open: false,
      },
      currentUid: localStorage.getItem('currentUid') || 'AD8A61A002FF',
      currentValidArea: [], //当前的有效区域
      currentInsType: 1, // 默认侧装
      currentRectangle: [], // 房间坐标
      currentArea: [], // 雷达区域
      context: null,
      firstPoints: null,
      drawWidth: 800,
      drawHeight: 600,
      drawConfig: {
        grap: 50,
        color: "#bbb",
      },
      baseList: [
        {
          type: 0,
          areaType: null,
          color: "rgba(108, 170, 176, 0.9)",
          name: require('@/assets/chartBed/border.png'),
          title: "边界",
          badge: null,
          menu: [],
        },
        {
          type: 1,
          areaType: 2,
          color: "rgba(132, 185, 197, 0.5)",
          name: require('@/assets/chartBed/bed.png'),
          title: "床",
          badge: null,
          menu: [],
        },
        {
          type: 2,
          areaType: 4,
          color: "rgba(202, 228, 214, 0.9)",
          name: require('@/assets/chartBed/door.png'),
          title: "门",
          badge: null,
          menu: [],
        },
        {
          type: 3,
          areaType: 3,
          color: "rgba(230, 230, 230, 0.9)",
          name: require('@/assets/chartBed/ganrao.png'),
          title: "干扰区域",
          badge: null,
          menu: [],
        },
        {
          type: 4,
          areaType: 7,
          color: "rgba(173,185,202, 0.7)",
          title: "工具",
          badge: null,
          menu: [],
        },
        {
          type: 5,
          areaType: 6,
          color: "rgba(192, 0, 0, 0.3)",
          title: "告警区域",
          badge: null,
          menu: [],
        },
        {
          type: 6,
          areaType: 1,
          color: "rgba(108, 170, 176, 0.9)",
          name: require('@/assets/chartBed/area.png'),
          title: "自定义",
          badge: null,
          menu: [],
        },
        {
          type: 7,
          areaType: 5,
          color: "rgba(197, 152, 63, 0.4)",
          title: "监护床",
          badge: null,
          menu: [],
        },
      ],
      currentType: "",
      currentTypeId: "",
      sizeWidth: null,
      sizeHeight: null,
      radarProp: {},
      radarPropArr: [],
      radarPropArrSource: [],
      mqttConfig: {
        host: 'ws://192.168.1.70:8083/mqtt',
        username: '',
        password: '',
        keepalive: 60,
        protocolId: 'MQTT',
        protocolVersion: 5,
        clean: true,
        connectTimeout: 30 * 1000,
        subTime: 10,
      },
      mqttConnected: false,
      mqttClient: null
    };
  },
  watch: {
    TrackData(newLength, oldLength) {
      if (this.drawBackground) {
        this.drawGrid(this.context);
        this.trackFresh(this.context);
      }else {
        this.drawBackground = null;
        this.drawBorder(this.context);
      }
    },
  },
  created() {
    this.getAttrList();
  },
  mounted() {
    // 创建canvas
    const canvas = this.$refs.myCanvas;
    this.context = canvas.getContext("2d");
  },
  beforeRouteLeave(to, from, next) {
    this.mqttDisconnect();
    this.timer && clearInterval(this.timer);
    this.timerSendName && clearInterval(this.timerSendName);
    this.timerNoData && window.clearInterval(this.timerNoData);
    this.timerNoData42 && window.clearInterval(this.timerNoData42);
    next();
  },
  methods: {
    changeUid() {
      localStorage.setItem('currentUid', this.currentUid);
    },
    expTrack(track) {
      const tempData = [[], [], [], [], [], [], [], []];
      track.forEach(([id, x, y, z, vx, vy, vz, minR, minAZI, minELE, maxR, maxAZI, maxELE, postion, event, rsv]) => {
        if (id != 88) {
          tempData[id] = [x, y, z, id, minELE, postion, "行走", vy];
        }
      });
      this.TrackData = this.newTrackData[0] ? this.newTrackData : [tempData];
      this.TrackDataLen = track.filter((item) => item[0] != 88).length;
      this.newTrackData = [tempData];
      // 42s后没收到数据，则重置echarts
      this.timerNoData42 && window.clearTimeout(this.timerNoData42);
      this.timerNoData42 = window.setTimeout(() => {
        this.TrackData = [[], [], [], [], []];
        this.TrackDataLen = 0;
      }, 42000);
      // 统计是否有人isHasPeople，统计距离上次获取到雷达数据的时间isNo16time，计算出dotColor
      //  A. 如果当前状态是有人，isNo16time<=3秒则显示绿色圆点， isNo16time>8则显示红点，在3-8之间显示黄点；
      //  B. 如果当前状态是无人，isNo16time<36秒则显示绿色圆点，isNo16time>72显示红点，在36-72之间显示黄点；
      this.isHasPeople = (track[0][0] != 88);
      if (this.timerNoData) {
        this.isNo16time = 1;
        window.clearInterval(this.timerNoData);
      }
      this.timerNoData = window.setInterval(() => {
        if(this.isHasPeople) {
          if(this.isNo16time<=3) {
            this.dotColor = 'springgreen';
          }else if(this.isNo16time>3 && this.isNo16time<=8) {
            this.dotColor = 'yellow';
          }else if(this.isNo16time>8) {
            this.dotColor = 'red';
          }
        }else {
          if(this.isNo16time<36) {
            this.dotColor = 'springgreen';
          }else if(this.isNo16time>36 && this.isNo16time<=72) {
            this.dotColor = 'yellow';
          }else if(this.isNo16time>72) {
            this.dotColor = 'red';
          }
        }
        this.isNo16time = ++this.isNo16time;
      }, 1000);
    },
    // MQTT测试连接
    mqttConnect() {
      if (!this.mqttConfig.host) {
        this.$message.error('请输入MQTT地址');
        return;
      }
      const options = {
        ...this.mqttConfig,
        host: null,
      };
      this.mqttClient = mqtt.connect(this.mqttConfig.host, options);
      this.mqttClient.on('connect', () => {
        this.$message.success('MQTT连接成功');
        this.mqttConnected = true;
        this.mqttSubscribe();
      });
      this.mqttClient.on('error', (error) => {
        this.$message.error('MQTT连接失败: ' + error.message);
        this.mqttConnected = false;
      });
      this.mqttClient.on('close', () => {
        this.$message.warning('MQTT连接已关闭');
        this.mqttConnected = false;
      });
    },
    // MQTT测试订阅
    mqttSubscribe() {
      if (!this.mqttClient || !this.mqttConnected) {
        this.$message.error('请先连接MQTT服务器');
        return;
      }
      this.mqttClient.subscribe(`/monitor/88/${this.currentUid}/post`, { qos: 0 }, (error) => {
        if (error) {
          this.$message.error('订阅失败: ' + error.message);
        } else {
          // this.$message.success('订阅成功');
          this.mqttPublish();
        }
      });
      // 监听消息
      this.mqttClient.on('message', (topic, message) => {
        const track = extractTrackData(JSON.parse(message.toString()).data.track, 'base64');
        console.log('收到消息:', track);
        this.expTrack(track);
      });
    },
    // MQTT测试发布
    mqttPublish() {
      if (!this.mqttClient || !this.mqttConnected) {
        this.$message.error('请先连接MQTT服务器');
        return;
      }
      const testMessage = {"cmd":"subscription","data":{"content":0,"duration":this.mqttConfig.subTime}};
      this.mqttClient.publish(`/monitor/88/${this.currentUid}/get`, JSON.stringify(testMessage), (error) => {
        if (error) {
          this.$message.error('发布失败: ' + error.message);
        } else {
          // this.$message.success('发布成功');
        }
      });
    },
    // MQTT测试断开
    mqttDisconnect() {
      if (this.mqttClient) {
        this.mqttClient.end();
        this.mqttConnected = false;
      }
    },
    sizeChange(sizeWidth, sizeHeight) {
      if (sizeWidth && sizeHeight) {
        this.sizeWidth = sizeWidth;
        this.sizeHeight = sizeHeight;
      }
      if ((this.sizeWidth && !/^\d+$/.test(this.sizeWidth)) || (this.sizeHeight && !/^\d+$/.test(this.sizeHeight))) {
        Message.info("长宽值有误");
        return
      }
      if(this.editArea) {// 编辑区域，单独处理
        const temp = this.getPixelPoint(this.editArea.slice(2));
        const [startX, startY, maxXDist, maxYDist] = this.drawAreaPoint(temp);
        const { clickX, clickY } = this.toDrawPoint(startX+Number(this.sizeWidth), +startY+Number(this.sizeHeight));
        this.isEditArea = 'rightBottom';
        this.scaleHelpFunc(clickX, clickY);
        this.drawBorder(this.context2);
        return
      }
      let finalyArea = [this.sizeWidth / 2, this.sizeHeight / 2, +this.sizeWidth, +this.sizeHeight];
      // 如果存在finalyScreenArea，则使用finalyScreenArea的中心点，无则将中心点初始化为（0,0）
      if(this.finalyScreenArea) {
        finalyArea[0] = this.finalyScreenArea[0];
        finalyArea[1] = this.finalyScreenArea[1];
      }else {
        if(this.currentInsType == 0) {
          finalyArea[0] = 400;
          finalyArea[1] = 300 - finalyArea[1];
        }else if(this.currentInsType == 1) {
          finalyArea[0] = 400;
          finalyArea[1] = this.sizeHeight/5 - finalyArea[1];
        }else {
          finalyArea[0] = 0;
          finalyArea[1] = 0;
        }
      }
      this.finalyArea = finalyArea;
      this.finalyScreenArea = finalyArea;
      this.drawBorder(this.context2);
      this.drawArea(this.context2, ...this.finalyArea, this.currentType.color);
    },
    // 绘制网格线
    drawGrid(context) {
      context.fillStyle = "#f9f9f9";
      context.fillRect(0, 0, this.drawWidth, this.drawHeight);
      // 绘制背景
      if(this.drawBackground) {
        context.drawImage(this.drawBackground, 0, 0, this.drawWidth, this.drawHeight);
      }else {
        this.drawBackground = null;
        this.drawBorder(context);
        return
      }
      // 绘制人形轨迹
      !!this.TrackData[0]?.length &&
        this.TrackData[0].forEach((item) => {
          if (item[0] || item[0] == 0) {
            // 姿态item[5] ["站立", "行走", "疑似跌倒", "蹲坐", "站立", "跌倒确认", "躺卧", "坐姿过低", "坐姿告警"]
            // 状态item[7] 0真实人员(黑色) 1监护人员(蓝色) 2可疑人员(灰色) 3预留(跟0一样) 4风扇 5宠物
            const imgs = {
              0: [this.$refs.posStand0, this.$refs.posStand1, this.$refs.posStand2, this.$refs.posStand0, this.$refs.posFan0, this.$refs.posPet0],
              1: [this.$refs.posWaker0, this.$refs.posWaker1, this.$refs.posWaker2, this.$refs.posWaker0, this.$refs.posFan0, this.$refs.posPet0],
              2: [this.$refs.posDown1, this.$refs.posDown1, this.$refs.posDown1, this.$refs.posDown1, this.$refs.posDown1, this.$refs.posDown1],
              3: [this.$refs.posSit0, this.$refs.posSit1, this.$refs.posSit2, this.$refs.posSit0, this.$refs.posFan0, this.$refs.posPet0],
              4: [this.$refs.posStand0, this.$refs.posStand1, this.$refs.posStand2, this.$refs.posStand0, this.$refs.posFan0, this.$refs.posPet0],
              5: [this.$refs.posDown2, this.$refs.posDown2, this.$refs.posDown2, this.$refs.posDown2, this.$refs.posDown2, this.$refs.posDown2],
              6: [this.$refs.posLying0, this.$refs.posLying1, this.$refs.posLying2, this.$refs.posLying0, this.$refs.posFan0, this.$refs.posPet0],
              7: [this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3],
              8: [this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4],
              9: [this.$refs.posSit0, this.$refs.posSit1, this.$refs.posSit2, this.$refs.posSit0, this.$refs.posFan0, this.$refs.posPet0],
              10: [this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3, this.$refs.posSit3],
              11: [this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4, this.$refs.posSit4],
            }
            const image = imgs[item[5]][item[7]];
            if (this.currentInsType == 0) {
              // 顶装
              context.drawImage(image, (Math.abs(item[0] - 40) * 100) / 10 - 15, (Math.abs(item[1] + 30) * 100) / 10 - 15, 30, 30);
            } else if (this.currentInsType == 1) {
              context.drawImage(image, (Math.abs(item[0] - 40) * 100) / 10 - 15, (Math.abs(item[1]) * 100) / 10 - 15, 30, 30);
            } else {
              // 墙装
              context.drawImage(image, (Math.abs(item[0]) * 100) / 10 - 15, (Math.abs(item[1]) * 100) / 10 - 15, 30, 30);
            }
          }
        });
      // context.draw();
    },
    trackFresh(context) {
      function getBezierPoint(startX, startY, endX, endY, t) {
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        return { x, y };
      }
      let currentTime = 0;
      this.animateTimer && cancelAnimationFrame(this.animateTimer);
      const animate = () => {
        this.newTrackData[0] && this.newTrackData[0].forEach((item,index) => {
          if(item[0] || item[0] == 0) {
            const [startX, startY, ...rect] = this.TrackData[0][index];
            const [endX, endY, ...newRect] = item;
            // 计算当前时间对应的贝塞尔曲线上的点
            const currentPoint = getBezierPoint(startX, startY, endX, endY, currentTime);
            // 使用当前点作为`drawImage`的参数
            this.TrackData[0][index] = [currentPoint.x, currentPoint.y, ...newRect];
          }
        })
        // 更新当前时间
        currentTime += 0.01;
        // 如果未到达终点，继续动画
        if (currentTime <= 1) {
          this.animateTimer = requestAnimationFrame(animate);
        }
        this.drawGrid(context);
      }
      animate();
    },
    drawBorder(context) {
      context.fillStyle = "#f9f9f9";
      context.fillRect(0, 0, this.drawWidth, this.drawHeight);
      // 绘制探测周界
      // "{-40,0;40,0;-40,60;40,60}" ==> [-40, 0, 40, 0, -40, 60, 40, 60] ==> [{x: 320, y: 0}, {x: 0, y: 200}]
      const pointArr = this.currentRectangle;
      const temp = [];
      if (this.currentInsType == 0) {
        // 顶装，插入中间2个换算后的坐标点
        temp.push({
          x: (Math.abs(pointArr[2] - 40) * 100) / 10,
          y: (Math.abs(pointArr[3] + 30) * 100) / 10,
        });
        // 去除取整逻辑
        // const spacting = Math.abs(pointArr[5]) % 5 == 0 ? 0 : Math.abs(pointArr[5] - pointArr[3] - 1) % 5;
        const spacting = 0;
        temp.push({
          x: (Math.abs(pointArr[4] - 40) * 100) / 10,
          y: (Math.abs(pointArr[5] + 30 + spacting) * 100) / 10,
        });
      } else if (this.currentInsType == 1) {
        // 侧装
        temp.push({
          x: (Math.abs(pointArr[2] - 40) * 100) / 10,
          y: (pointArr[3] * 100) / 10,
        });
        temp.push({
          x: (Math.abs(pointArr[4] - 40) * 100) / 10,
          y: (pointArr[5] * 100) / 10,
        });
      }else {
        // 墙装
        temp.push({
          x: (Math.abs(pointArr[2]) * 100) / 10,
          y: (pointArr[3] * 100) / 10,
        });
        temp.push({
          x: (Math.abs(pointArr[4]) * 100) / 10,
          y: (pointArr[5] * 100) / 10,
        });
      }
      const [startX, startY, maxXDist, maxYDist] = this.drawAreaPoint(temp);
      context.fillStyle = "rgba(10, 10, 10, 0.5)";
      context.fillRect(0, 0, this.drawWidth, this.drawHeight);
      context.fillStyle = "#f9f9f9";
      context.fillRect(startX, startY, maxXDist, maxYDist);
      this.currentValidArea = [startX, startY, maxXDist, maxYDist]; //当前的有效区域

      // 绘制区域
      if (!!this.currentArea.length) {
        // 坐标转区域
        const rectangleToArea = (pointArr = [area_id, area_type, 8, 35, 10, 35, 10, 37, 8, 37]) => {
          const temp = [];
          // 插入中间2个换算后的坐标点
          if (this.currentInsType == 0) {
            // 顶装最大范围 -2<x<2，-3<y<3
            temp.push({
              x: ((40 - pointArr[4]) * 100) / 10,
              y: ((pointArr[5] + 30) * 100) / 10,
            });
            // 去除取整逻辑
            // const spacting = Math.abs(pointArr[7]) % 5 == 0 ? 0 : Math.abs(pointArr[7] - pointArr[5] - 1) % 5;
            const spacting = 0;
            temp.push({
              x: ((40 - pointArr[6]) * 100) / 10,
              y: ((pointArr[7] + 30 + spacting) * 100) / 10,
            });
          } else if (this.currentInsType == 1) {
            // 侧装最大范围 -4<x<4，0<y<6
            temp.push({
              x: ((40 - pointArr[4]) * 100) / 10,
              y: ((pointArr[5]) * 100) / 10,
            });
            temp.push({
              x: ((40 - pointArr[6]) * 100) / 10,
              y: ((pointArr[7]) * 100) / 10,
            });
          }else {
            // 墙装最大范围 -8<x<0，0<y<6
            temp.push({
              x: (-(pointArr[4]) * 100) / 10,
              y: ((pointArr[5]) * 100) / 10,
            });
            temp.push({
              x: (-(pointArr[6]) * 100) / 10,
              y: ((pointArr[7]) * 100) / 10,
            });
          }
          const [startX, startY, maxXDist, maxYDist] = this.drawAreaPoint(temp);
          context.fillStyle = this.baseList.find(item => item.areaType==pointArr[1]).color;
          context.fillRect(startX, startY, maxXDist, maxYDist);

          if(pointArr[1] == 6) { // 告警区域设置边框
            context.setLineDash([5, 5]);
            context.strokeStyle = '#325395'; 
            context.lineWidth = 1.5;
            context.strokeRect(startX, startY, maxXDist, maxYDist); 
          }

          let areaTitle = this.baseList.find(item => item.areaType==pointArr[1]).title;
          this.drawText(context, areaTitle, startX + maxXDist / 2, startY, "#080808");
        };
        this.currentArea.forEach((item) => {
          rectangleToArea(item);
        });
        // 编辑区域，在区域四角上补充方块
        if(this.editArea) {
          const temp = this.getPixelPoint(this.editArea.slice(2));
          const [startX, startY, maxXDist, maxYDist] = this.drawAreaPoint(temp);
          context.setLineDash([]);
          context.strokeStyle = '#2d93fc'; 
          context.lineWidth = 2;
          context.strokeRect(startX, startY, maxXDist, maxYDist); 
        }
      }
      const grap = this.drawConfig.grap;
      // 绘制网格线
      context.lineWidth = 0.5;
      context.strokeStyle = this.drawConfig.color;
      for (let i = 0; i <= this.drawWidth; i += grap) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, this.drawHeight);
        context.stroke();
      }
      for (let j = 0; j <= this.drawHeight; j += grap) {
        context.beginPath();
        context.moveTo(0, j);
        context.lineTo(this.drawWidth, j);
        context.stroke();
      }
      // 绘制雷达图片
      const image = new Image();
      image.src = imgRadar;
      image.onload = () => {
        if (this.currentInsType == 0) {
          // 顶装
          context.drawImage(image, 8 * grap - 25, 6 * grap - 25, 50, 50);
        } else if (this.currentInsType == 1) {
          context.drawImage(image, 8 * grap - 25, -25, 50, 50);
        } else {
          // 墙装
          context.save();
          context.translate(15, 15);
          context.rotate(45 * Math.PI / 180);
          context.drawImage(image, -40, -25, 50, 50);
          context.restore();
        }
        // 设置canvas背景
        if (!this.drawBackground) {
          const drawBackground = new Image();
          drawBackground.src = this.$refs.myCanvas.toDataURL();

          drawBackground.onload = () => {
            this.drawBackground = drawBackground;
          };
        }
      };
    },
    drawArea(context, startX, startY, maxXDist, maxYDist, color = "rgba(10, 10, 10, 0.5)") {
      if (!this.sizeWidth || !this.sizeHeight) {
        return;
      }
      context.fillStyle = color;
      context.fillRect(startX, startY, maxXDist, maxYDist);
      this.drawText(context, '', startX + maxXDist / 2, startY, "#080808");
    },
    drawAreaPoint(coords, isRounding = false) {
      const { grap } = this.drawConfig;
      const maxX = Math.max(...coords.map((coord) => coord.x));
      const minX = Math.min(...coords.map((coord) => coord.x));
      const maxY = Math.max(...coords.map((coord) => coord.y));
      const minY = Math.min(...coords.map((coord) => coord.y));
      if (isRounding) {
        // 取整逻辑
        const startX = minX - (minX % grap);
        const startY = minY - (minY % grap);
        // let xDist = maxX == minX ? grap : Math.abs(maxX - minX);
        // let yDist = maxY == minY ? grap : Math.abs(maxY - minY);
        let xDist = Math.abs(maxX - minX);
        let yDist = Math.abs(maxY - minY);
        if (maxY == 0 && minY == 0) {
          yDist = 0;
        }
        if (maxX == 0 && minX == 0) {
          xDist = 0;
        }
        const maxXDist = xDist % grap === 0 ? xDist : xDist - (xDist % grap) + grap;
        const maxYDist = yDist % grap === 0 ? yDist : yDist - (yDist % grap) + grap;
        return [startX, startY, maxXDist, maxYDist];
      } else {
        const startX = minX;
        const startY = minY;
        // let xDist = maxX == minX ? grap : Math.abs(maxX - minX);
        // let yDist = maxY == minY ? grap : Math.abs(maxY - minY);
        let xDist = Math.abs(maxX - minX);
        let yDist = Math.abs(maxY - minY);
        if (maxY == 0 && minY == 0) {
          yDist = 0;
        }
        if (maxX == 0 && minX == 0) {
          xDist = 0;
        }
        const maxXDist = xDist;
        const maxYDist = yDist;
        return [startX, startY, maxXDist, maxYDist];
      }
    },
    drawText(context, text, x, y, color, size = 18) {
      //文字部分
      context.beginPath();
      context.textAlign = "center";
      context.fillStyle = color;
      context.font = `${size}px Arial`;
      const metrics = context.measureText(text);
      //文字统一偏移
      // context.fillText(text, x + metrics.width / 2, y + 17);
      context.fillText(text, x, y + 30);
    },
    // 获取鼠标位置
    getMousePosition(event) {
      const rect = this.$refs.myCanvas2.getBoundingClientRect();
      const x = event.clientX - rect.left * (this.drawWidth / rect.width);
      const y = event.clientY - rect.top * (this.drawHeight / rect.height);
      return { x, y };
    },
    gridClick(index) {
      this.currentType = this.baseList[index];
      this.currentTypeId = this.baseList[index].areaType;
    },
    onMouseDown(event) {
      const { x, y } = this.getMousePosition(event);
      this.firstPoints = { x, y };

      // 判断是否在编辑区域
      this.downEvent = event;
      this.editArea = this.inCommonArea(x, y, false, 1)[0];
      if(this.editArea) {
        const index = this.baseList.findIndex(item => item.areaType == this.editArea[1]);
        this.gridClick(index);
        this.areaType = index;
        const temp = this.getPixelPoint(this.editArea.slice(2));
        const [startX, startY, maxXDist, maxYDist] = this.drawAreaPoint(temp);
        this.sizeWidth = maxXDist;
        this.sizeHeight = maxYDist;
        this.drawBorder(this.context2);
      }
    },
    onLongtap(event) {
      const { x, y } = this.getMousePosition(event);
      // 判断当前点是否存在区域
      const clickArea = this.inCommonArea(x, y);
      if (!clickArea.length) {
        Message.info('未选中区域');
        return;
      }
      
      MessageBox.confirm("确认删除选中区域吗？", "系统提示").then(() => {
        const regex = new RegExp(`(^|,)\\{${clickArea[0][0]},.*?\\}(,|$)`, 'g');
        const result = this.radarProp['declare_area'].replace(regex, '');
        const params = {
          uid: this.currentUid,
          properties: {
            "declare_area": result,
          }
        };
        this.freshAreaDialog(params);
      }).catch(() => {
        Message.info('删除操作已取消');
      });
    },
    onMouseMove(event) {
      this.moveEvent = event;
      
      if (!this.firstPoints) {
        return;
      }
      if (!this.currentType) {
        Message.info('请先选择区域类型');
        this.firstPoints = null;
        return;
      }
      const point = this.getMousePosition(event);
      const finalyArea = this.drawAreaPoint([this.firstPoints, point], true);
      if(finalyArea[2]==0 || finalyArea[3]==0) {  // 屏蔽绘制区域太小的情况
        return
      }
      this.finalyArea = finalyArea;
      if (this.drawTimer) {
        return;
      }
      this.drawTimer = setInterval(() => {
        this.drawBorder(this.context2);
        this.drawArea(this.context2, ...this.finalyArea, this.currentType.color);
        this.finalyScreenArea = this.finalyArea;
        this.sizeWidth = this.finalyScreenArea[2];
        this.sizeHeight = this.finalyScreenArea[3];
      }, 100);
    },
    onMouseUp(event) {
      this.isEditArea = null;
      this.firstPoints = null;
      this.drawTimer && clearInterval(this.drawTimer);
      this.drawTimer = null;
    },
    // 界面坐标转换为canvas实际坐标
    toDrawPoint(x, y) {
      const grap = this.drawConfig.grap;
      const clickX = this.currentInsType == 2 ? -parseFloat((x / grap) * 5).toFixed(1) : +parseFloat(40 - (x / grap) * 5).toFixed(1);
      const clickY = this.currentInsType == 0 ? +parseFloat((y / grap) * 5 - 30).toFixed(1) : +parseFloat((y / grap) * 5).toFixed(1);
      return { clickX, clickY };
    },
    // 判断当前点是否与区域重叠
    inCommonArea(x, y, strict = false, spacing = 0) {
      const { clickX, clickY } = this.toDrawPoint(x, y);
      const clickArea = this.currentArea.filter((item) => {
        const maxX = Math.max(item[2] + spacing, item[4] + spacing, item[6] + spacing, item[8] + spacing);
        const minX = Math.min(item[2] - spacing, item[4] - spacing, item[6] - spacing, item[8] - spacing);
        const maxY = Math.max(item[3] + spacing, item[5] + spacing, item[7] + spacing, item[9] + spacing);
        const minY = Math.min(item[3] - spacing, item[5] - spacing, item[7] - spacing, item[9] - spacing);
        if (strict) {  //严格校验是否重叠
          return minX <= clickX && clickX <= maxX && minY <= clickY && clickY <= maxY;
        }
        return minX < clickX && clickX < maxX && minY < clickY && clickY < maxY;
      });
      return clickArea;
    },
    // 判断鼠标是否在顶点方块内
    isMouseInSquare(mouseX, mouseY, squareSettings, Rect) {
      return (
        mouseX > squareSettings.x &&
        mouseX < squareSettings.x + squareSettings.width &&
        mouseY > squareSettings.y &&
        mouseY < squareSettings.y + squareSettings.height
      );
    },
    // 区域编辑缩放
    scaleHelpFunc(clickX, clickY) {
      switch(this.isEditArea) {
        case 'left':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[4] = clickX;
              this.editArea[8] = clickX;
              item[4] = clickX;
              item[8] = clickX;
            }
          })
          break;
        case 'right':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[2] = clickX;
              this.editArea[6] = clickX;
              item[2] = clickX;
              item[6] = clickX;
            }
          })
          break;
        case 'top':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[3] = clickY;
              this.editArea[5] = clickY;
              item[3] = clickY;
              item[5] = clickY;
            }
          })
          break;
        case 'bottom':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[7] = clickY;
              this.editArea[9] = clickY;
              item[7] = clickY;
              item[9] = clickY;
            }
          })
          break;
        case 'rightTop':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[2] = clickX;
              this.editArea[6] = clickX;
              this.editArea[3] = clickY;
              this.editArea[5] = clickY;
              item[2] = clickX;
              item[6] = clickX;
              item[3] = clickY;
              item[5] = clickY;
            }
          })
          break;
        case 'leftTop':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[4] = clickX;
              this.editArea[8] = clickX;
              this.editArea[3] = clickY;
              this.editArea[5] = clickY;
              item[4] = clickX;
              item[8] = clickX;
              item[3] = clickY;
              item[5] = clickY;
            }
          })
          break;
        case 'rightBottom':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[2] = clickX;
              this.editArea[6] = clickX;
              this.editArea[7] = clickY;
              this.editArea[9] = clickY;
              item[2] = clickX;
              item[6] = clickX;
              item[7] = clickY;
              item[9] = clickY;
            }
          })
          break;
        case 'leftBottom':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea[4] = clickX;
              this.editArea[8] = clickX;
              this.editArea[7] = clickY;
              this.editArea[9] = clickY;
              item[4] = clickX;
              item[8] = clickX;
              item[7] = clickY;
              item[9] = clickY;
            }
          })
          break;
        case 'move':
          const disdX = -(this.moveEvent.clientX - this.downEvent.clientX)/10;
          const disdY = (this.moveEvent.clientY - this.downEvent.clientY)/10;
          const editArea = this.currentArea.find(item => item[0] == this.editArea[0]);
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              this.editArea = [
                editArea[0], editArea[1],
                editArea[2]+disdX, editArea[3]+disdY,
                editArea[4]+disdX, editArea[5]+disdY,
                editArea[6]+disdX, editArea[7]+disdY,
                editArea[8]+disdX, editArea[9]+disdY,
              ];
              item[2] = editArea[2]+disdX;
              item[4] = editArea[4]+disdX;
              item[6] = editArea[6]+disdX;
              item[8] = editArea[8]+disdX;
              item[3] = editArea[3]+disdY;
              item[5] = editArea[5]+disdY;
              item[7] = editArea[7]+disdY;
              item[9] = editArea[9]+disdY;
            }
          })
          break;
      }
    },
    // 区域编辑移动
    moveHelpFunc() {
      switch(this.isEditArea) {
        case 'moveUp':
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              item[3] = this.editArea[3]-1;
              item[5] = this.editArea[5]-1;
              item[7] = this.editArea[7]-1;
              item[9] = this.editArea[9]-1;
            }
          })
          break;
        case 'moveDown': //下移
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              item[3] = this.editArea[3]+1;
              item[5] = this.editArea[5]+1;
              item[7] = this.editArea[7]+1;
              item[9] = this.editArea[9]+1;
            }
          })
          break;
        case 'moveLeft':  //左移
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              item[2] = this.editArea[2]+1;
              item[4] = this.editArea[4]+1;
              item[6] = this.editArea[6]+1;
              item[8] = this.editArea[8]+1;
            }
          })
          break;
        case 'moveRight':  //右移
          this.currentArea.forEach(item => {
            if(item[0] === this.editArea[0]) {
              item[2] = this.editArea[2]-1;
              item[4] = this.editArea[4]-1;
              item[6] = this.editArea[6]-1;
              item[8] = this.editArea[8]-1;
            }
          })
          break;
      }
    },
    getPixelPoint(pointArr) {
      const temp = [];
      if (this.currentInsType == 0) {
        // 顶装，插入中间2个换算后的坐标点
        temp.push({
          x: (Math.abs(pointArr[2] - 40) * 100) / 10,
          y: (Math.abs(pointArr[3] + 30) * 100) / 10,
        });
        // 去除取整逻辑
        // const spacting = Math.abs(pointArr[5]) % 5 == 0 ? 0 : Math.abs(pointArr[5] - pointArr[3] - 1) % 5;
        const spacting = 0;
        temp.push({
          x: (Math.abs(pointArr[4] - 40) * 100) / 10,
          y: (Math.abs(pointArr[5] + 30 + spacting) * 100) / 10,
        });
      } else if (this.currentInsType == 1) {
        // 侧装
        temp.push({
          x: (Math.abs(pointArr[2] - 40) * 100) / 10,
          y: (pointArr[3] * 100) / 10,
        });
        temp.push({
          x: (Math.abs(pointArr[4] - 40) * 100) / 10,
          y: (pointArr[5] * 100) / 10,
        });
      } else {
        // 墙装
        temp.push({
          x: (Math.abs(pointArr[2]) * 100) / 10,
          y: (pointArr[3] * 100) / 10,
        });
        temp.push({
          x: (Math.abs(pointArr[4]) * 100) / 10,
          y: (pointArr[5] * 100) / 10,
        });
      }
      return temp;
    },
    // 判断当前点是否在探测周界区域
    inBorderArea() { },
    // 判断监护床中心点是否在监护范围中
    inWardArea(startX, startY, maxXDist, maxYDist) {
      const leng = +maxXDist / this.drawConfig.grap / 2; //床的长度
      const wid = +maxYDist / this.drawConfig.grap / 2; //床的宽度
      if ((leng > 2 && wid > 2) || (leng > 2 || wid > 2)) {
        return { type: 1, msg: '监护床尺寸不能小于2米' };
      }
      const { clickX, clickY } = this.toDrawPoint(startX + maxXDist / 2, startY + maxYDist / 2);
      const { installType, height } = this.CornerData;
      const x = Math.abs(clickX / 10);
      const y = Math.abs(clickY / 10);
      const z = height;  //分米==》米
      if (z < 1.5 || z > 3.5) {
        return { type: 1, msg: '监护床高度必须在1.5米到3.5米之间' };
      }
      console.log('监护床的x y z轴分别是', x, y, z);
      if (installType == 1 && (x > 0.5 || y > 1.5)) {
        return { type: 2, msg: '监护床侧装尺寸不能大于0.5米' };
      } else if (installType == 2 && (x > 0.5 || y > 1.5)) {
        return { type: 2, msg: '监护床墙装尺寸不能大于0.5米' };
      } else if (installType == 0 && (x > 0.5 || y > 0.5)) {
        return { type: 2, msg: '监护床顶装尺寸不能大于0.5米' };
      }
      return false;
    },
    async getAttrList() {
      try {
        return await new Promise((resolve, reject) => {
          axios.get(`/prod-api/get/prop?uid=${this.currentUid}`).then((response) => {
            if (response.data.code !== 200) {
              return;
            }
            this.radarProp = response.data.data;
            const { radar_install_style, rectangle, declare_area, } = response.data.data;
            const [rightTop, leftTop, rightBottom, leftBottom] = rectangle.replace(/^\{|\}/g, "").split(";");
            const [leftBorder, rightBorder, frontBorder, backBorder] = this.rectangleToBorder(leftTop, leftBottom, rightTop, rightBottom);
            this.CornerData = {
              installType: radar_install_style,
              leftBorder: Math.abs(leftBorder),
              rightBorder: Math.abs(rightBorder),
              frontBorder: Math.abs(frontBorder),
              backBorder: Math.abs(backBorder),
            };
            this.currentInsType = radar_install_style;
            // 设置2.0方案画布大小
            this.drawerWidth = (this.CornerData.leftBorder + this.CornerData.rightBorder) * 100;
            this.drawerHeight = (this.CornerData.frontBorder + this.CornerData.backBorder) * 100;
            // 格式转换："{-40,0;40,0;-40,60;40,60}" ==> [-40, 0, 40, 0, -40, 60, 40, 60]
            this.currentRectangle = rectangle.split(/[{},;]/).filter((x_1) => x_1 !== "").map(Number);
            // 坐标转区域
            const rectangleToArea = (rectangle_2 = [area_id, area_type, 8, 35, 10, 35, 10, 37, 8, 37]) => {
              const xData = [
                this.drawerWidth / 20 - rectangle_2[2],
                this.drawerWidth / 20 - rectangle_2[4],
                this.drawerWidth / 20 - rectangle_2[6],
                this.drawerWidth / 20 - rectangle_2[8],
              ];
              const xMax = Math.max(...xData);
              const xMin = Math.min(...xData);
              const yData = [rectangle_2[3], rectangle_2[5], rectangle_2[7], rectangle_2[9]];
              const yMax = Math.max(...yData);
              const yMin = Math.min(...yData);
              return [this.CornerData.leftBorder * 10 - (xMax + xMin) / 2, (yMax + yMin) / 2, (xMax - xMin) * 10, (yMax - yMin) * 10, '门'];
            };
            const AreaData = splitArray(
              declare_area ? declare_area.split(",").map((item) => item.replace(/^{|}$/g, "")) : [],
              10
            ).filter((item_1) => !!item_1[5]);
            this.TrackData = [this.TrackData[0], [], [], [], [], [], [], []];
            AreaData.forEach((item_2) => {
              this.TrackData[item_2[1]].push(rectangleToArea(item_2));
            });
            this.AreaData = AreaData;
            // 格式转换：{area_id,area_type,8,35,10,35,10,37,8,37} ==》 [area_id,area_type,8,35,10,35,10,37,8,37]
            const pointArr = declare_area ? declare_area
              .split(/[{},;]/)
              .filter((x_2) => x_2 !== "")
              .map(Number) : [];
            this.currentArea = splitArray(pointArr, 10);
            this.drawBackground = null;
            this.drawBorder(this.context);
            // table表格
            this.radarPropArr = Object.keys(response.data.data).map(key => {
              let value_2 = response.data.data[key];
              if (['fall_param', 'heart_breath_param'].includes(key)) {
                value_2 = extractTrackData(value_2, 'base64').toString();
              }
              return { key: key, value: value_2 };
            });
            this.radarPropArrSource = JSON.parse(JSON.stringify(this.radarPropArr));
          }).catch(() => {
          });
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    },
    // 角度转换成边界
    rectangleToBorder(leftTop, leftBottom, rightTop, rightBottom) {
      const xData = [+leftTop.split(",")[0], +leftBottom.split(",")[0], +rightTop.split(",")[0], +rightBottom.split(",")[0]];
      const yData = [+leftTop.split(",")[1], +leftBottom.split(",")[1], +rightTop.split(",")[1], +rightBottom.split(",")[1]];
      const rightBorder = Math.min(...xData) || 0;
      const leftBorder = Math.max(...xData) || 0;
      const backBorder = Math.min(...yData) || 0;
      const frontBorder = Math.max(...yData) || 0;
      return [leftBorder / 10, rightBorder / 10, frontBorder / 10, backBorder / 10];
    },
    // 编辑区域
    openAreaDialog() {
      this.AreaDialog.open = true;
      // 创建2.0canvas
      this.$nextTick(() => {
        const canvas = this.$refs.myCanvas2;
        this.myCanvas2 = canvas;
        this.context2 = canvas.getContext("2d");
        this.drawBorder(this.context2);
      });
    },
    freshAreaDialog(params) {
      this.AreaDialog.loading = true;
      axios.post("/prod-api/set/prop", params).then((response) => {
        if(response.data.code !== 200) {
          return;
        }
        Message.success('操作成功');
        this.editArea = null;
        this.getAttrList().then(() => {
          setTimeout(() => {
            this.AreaDialog.loading = false;
            this.clearData();
            this.openAreaDialog();
          }, 1000);
        });
      }).catch(() => {
        Message.error('操作失败');
        this.AreaDialog.loading = false;
      });
    },
    saveRadarProps() {
      const changes = {};
      this.radarPropArr.forEach(item => {
        const sourceItem = this.radarPropArrSource.find(source => source.key === item.key);
        if (sourceItem && sourceItem.value !== item.value) {
          changes[item.key] = item.value;
        }
      });
      if (Object.keys(changes).length === 0) {
        this.$message.info('没有修改的内容');
        return;
      }
      const params = {
        uid: "AD8A61A002FF",
        properties: changes
      };
      axios.post("/prod-api/set/prop", params).then((response) => {
        this.$message.success('保存成功');
        this.getAttrList();
      }).catch((error) => {
        console.error('保存失败:', error);
        this.$message.error('保存失败');
      });
    },
    handleAddArea() {
      if(this.sizeWidth<10 || this.sizeHeight<10) {
        Message.info('绘制区域太小'.replace('x*x', '10*10'));
        return
      }
      if(this.editArea) { // 编辑区域，直接走保存
        const regex = new RegExp(`(^|,)\\{${this.editArea[0]},.*?\\}(,|$)`, 'g');
        const result = this.radarProp['declare_area'].replace(regex, `,{${this.editArea.toString()}},`);
        const params = {
          uid: this.currentUid,
          properties: {
            "declare_area": result,
          }
        };
        this.freshAreaDialog(params);
        return
      }
      if (!this.sizeWidth || !this.sizeHeight) {
        return;
      }
      // 小程序版canvas方案
      if (!this.finalyArea) {
        Message.info('监护床尺寸必须在10米到30米之间');
        return;
      }
      const [startX, startY, maxXDist, maxYDist] = this.finalyArea;
      // 判断监护床的“中心点”半径是否在雷达下方
      const inWardArea = this.inWardArea(startX, startY, maxXDist, maxYDist);
      if (this.currentTypeId == 5 && inWardArea != false) {
        this.$confirm(inWardArea.msg, '监护床尺寸必须在10米到30米之间', {
          confirmButtonText: '确认',
          showClose: false,
          showCancelButton: false,
          type: "warning",
          center: true,
        })
        return;
      }
      const grap = this.drawConfig.grap;
      let leftTopPoint, rightTopPoint, leftBottomPoint, rightBottomPoint;
      if (this.currentInsType == 0) {
        // 顶装最大范围 -2<x<2，-3<y<3
        leftTopPoint = `${parseInt(40 - (startX / grap) * 5)},${parseInt((startY / grap) * 5 - 30)}`;
        rightTopPoint = `${parseInt(40 - ((startX + maxXDist) / grap) * 5)},${parseInt((startY / grap) * 5 - 30)}`;
        leftBottomPoint = `${parseInt(40 - (startX / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5 - 30)}`;
        rightBottomPoint = `${parseInt(40 - ((startX + maxXDist) / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5 - 30)}`;
      } else if (this.currentInsType == 1) {
        // 侧装最大范围 -4<x<4，0<y<6
        leftTopPoint = `${parseInt(40 - (startX / grap) * 5)},${parseInt((startY / grap) * 5)}`;
        rightTopPoint = `${parseInt(40 - ((startX + maxXDist) / grap) * 5)},${parseInt((startY / grap) * 5)}`;
        leftBottomPoint = `${parseInt(40 - (startX / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5)}`;
        rightBottomPoint = `${parseInt(40 - ((startX + maxXDist) / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5)}`;
      } else {
        // 墙装最大范围 -8<x<0，0<y<6
        leftTopPoint = `${-parseInt((startX / grap) * 5)},${parseInt((startY / grap) * 5)}`;
        rightTopPoint = `${-parseInt(((startX + maxXDist) / grap) * 5)},${parseInt((startY / grap) * 5)}`;
        leftBottomPoint = `${-parseInt((startX / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5)}`;
        rightBottomPoint = `${-parseInt(((startX + maxXDist) / grap) * 5)},${parseInt(((startY + maxYDist) / grap) * 5)}`;
      }

      // 组装params
      const areaIds = this.currentArea.map((item) => +item[0]);
      const areaIdList = Array.from(Array(17), (v, k) => k).filter((e) => !areaIds.includes(e)); // 更新全局areaId列表
      let declare_area = this.radarProp.declare_area;
      if(!declare_area) {
        declare_area = `{${areaIdList[0]},5,${rightTopPoint},${leftTopPoint},${rightBottomPoint},${leftBottomPoint}},`;
      }else {
        declare_area += `{${areaIdList[0]},5,${rightTopPoint},${leftTopPoint},${rightBottomPoint},${leftBottomPoint}},`;
      }
      const params = {
        uid: this.currentUid,
        properties: {
          "declare_area": declare_area,
        }
      };
      this.freshAreaDialog(params);
    },
    handleCancleArea() {
      this.AreaDialog.open = false;
      this.clearData();
    },
    clearData() {
      this.editArea = null;
      this.isEditArea = null;
      this.sizeWidth = null;
      this.sizeHeight = null;
      this.finalyScreenArea = null;
      this.currentType = null;
      this.areaType = null;
      this.menuType = null;
    },
  },
};
</script>


<style scoped>
@import "./index.scss";
.container {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 40px;
  padding-bottom: 15px;
}

.dotClass {
  display: block;
  width: 10px;
  height: 10px;
  margin: auto;
  border-radius: 50%;
}
</style>