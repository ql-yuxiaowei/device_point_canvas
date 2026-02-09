
// 解析轨迹数据
export function splitArray(arr, size = 16) {
    const arrNum = Math.ceil(arr?.length / size, 10); // Math.ceil()向上取整的方法，用来计算拆分后数组的长度
    let index = 0; // 定义初始索引
    let resIndex = 0; // 用来保存每次拆分的长度
    const result = [];
    while (index < arrNum) {
        result[index] = arr.slice(resIndex, size + resIndex);
        resIndex += size;
        index++;
    }
    return result;
}

export function extractTrackData(trackData, type) {
    const processTrackData = (byteArray) => {
        const splitResult = splitArray(byteArray);
        return splitResult.map(item => {
            const processedItem = [...item];
            // 处理第2-3位（索引1和2），将单字节转换为有符号整数
            if (processedItem.length > 2) {
                processedItem[1] = processedItem[1] > 127 ? processedItem[1] - 256 : processedItem[1];
                processedItem[2] = processedItem[2] > 127 ? processedItem[2] - 256 : processedItem[2];
            }
            return processedItem;
        });
    };
    if (type === 'base64') {
        const binaryString = atob(trackData);
        const byteArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }
        return processTrackData(Array.from(byteArray));
    }
    return splitArray(trackData);
}

export function drawText(context, text, x, y, color, size = 18) {
    context.beginPath();
    context.textAlign = "center";
    context.fillStyle = color;
    context.font = `${size}px Arial`;
    context.fillText(text, x, y + 30);
}
