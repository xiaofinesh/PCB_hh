# 致甲方：PCB 检测系统开发数据与资料需求清单

> **文档目的**：我方（乙方）正在开发 AI 视觉缺陷检测系统，以贵司之前提供的 `4716063LL` 样例为参考基准，梳理本次开发所需的补充数据和技术资料。
>
> **参考样例**：`4716063LL/`（包含扫描结果、工程 CAM、设备配置三部分）

---

## 一、检测图像数据需求

### 1.1 缺陷样品图像（NG 图）

我方希望按照 `4716063LL/4716063扫描结果/` 已有的格式扩充数据：

| 需求项 | 格式参考 | 规模要求 |
|--------|----------|----------|
| 原始高清缺陷图 | 类似 `extracted_images/` 下的 JPG | 每款板 ≥ 50 张 |
| 标注后的缺陷图 | 类似 `annotated/` 下的 JPG（含红框） | 与原图一一对应 |
| 缺陷坐标与类型文本 | 类似 `A2/1.txt`、`B1/1.txt` 的格式 | 每张图都需标注 |
| 板号覆盖 | 参考 4716063LL 一款 | **≥ 20 款不同产品** |

**重要要求**：
- 分辨率：≥ 2000×2000 像素（参考 4716063LL 的 2432×2803）
- 正反两面都提供（Top / Bot）
- 一张图上多个缺陷需分别标注，不要合并
- 覆盖所有已知缺陷类型（见下方缺陷类型清单）

### 1.2 良品样品图像（OK 图）⚠️ 4716063LL 中完全缺失

4716063LL 只有缺陷板数据，**缺乏对照基准**。请补充：

- 每款板 **≥ 20 张**同批次无缺陷板的图像
- 与 NG 图在**同一设备、同一光照、同一工位**条件下采集
- 分正反面

### 1.3 缺陷类型字典 ⚠️ 关键缺失

我方从 4716063LL 中提取到以下术语，**但具体定义不明**，请提供《缺陷类型字典》：

| 提取到的术语 | 出现位置 | 我方推测（待确认） |
|------------|----------|-------------------|
| `线路间2` | A2/2.txt、A2/3.txt、A2/5.txt | 线路间距异常？第 2 级严重？ |
| `小尺寸通孔` | B1/1.txt、B1/5.txt、B1/7.txt | Via 直径偏小？ |
| `小尺寸金属` | A2/3.txt、B1/1.txt、B2/2.txt | 铜面小型残留？ |
| `中尺寸文字` | A2/1.txt、B1/5.txt | 丝印文字异常？ |
| `绿油铜1` | A2/4.txt、B1/3.txt | 阻焊破损露铜？"1" 的含义？ |
| `中尺寸孔环` | B1/7.txt、B2/7.txt | 焊盘环宽不足？ |
| `@@@` 前缀 | B1/4.txt 内容："`@@@小尺寸金属...`" | 严重等级标记？ |
| `已检修` | Image*.txt 文件 | 已人工返修？ |

**请提供的字典应包含**：
- 缺陷代码（如 `线路间2`）↔ 中英文名称 ↔ 工艺原因 ↔ 视觉示意图 ↔ 判定标准（数值阈值）
- 命名规则解析（如是否存在"线路间1/2/3"递进系列？）

### 1.4 检测算法名称解释

4716063LL 中出现的算法名称，也请说明用途和参数：

| 算法名称 | 使用次数 | 我方猜测 |
|---------|---------|----------|
| `斑点检测` | 12 | 高倍率斑点型缺陷识别 |
| `G新低倍缺陷检测` | 7 | "G" 指代？新版本算法？ |
| `低倍-斑点低倍检测` | 5 | 低倍率下的斑点检测 |
| `色差检测` | 2 | RGB 差异对比 |
| `区域内-边缘检测` | 1 | 指定区域内边缘 |
| `区域外-边缘检测` | 1 | 指定区域外边缘 |

---

## 二、产线检测文件资料

### 2.1 CAM 文件 ✓ 已提供

`4716063LL/工程cam/` 中的 Gerber RS-274X 文件我方可通过 KiCad / CAM350 / ViewMate 打开，但需要甲方确认以下解读：

| 文件 | 我方解读 | 待确认 |
|------|---------|--------|
| `set63.gtl` | 顶层铜箔 | ✓? |
| `set63.gbl` | 底层铜箔 | ✓? |
| `set63.l2` / `set63.l3` | 内层 2 / 3 | ✓? |
| `set63.gto` / `set63.gbo` | 顶 / 底丝印 | ✓? |
| `set63.gts` / `set63.gbs` | 顶 / 底阻焊 | ✓? |
| `set63.gtp` / `set63.gbp` | 顶 / 底锡膏 | ✓? |
| `set63.drill.out` | 钻孔文件 | ✓? |
| `set63.rout` | 外形铣边 | ✓? |
| 坐标格式 `FSLAX26Y26` | 2 位整数 + 6 位小数 | ✓? |
| 单位 `MOIN` | 英寸 | ✓? |
| 文件名 `set63` | 与 4716063 关联？"63" 含义？ | **待甲方说明** |

### 2.2 设备软件专有文件 ⚠️ 我方已自行解析，请确认

我方已对 `4716063LL/设备软件做的资料/` 下的二进制文件做了**逆向分析**，发现以下信息（详见下文"附录 A"），但仍需甲方确认：

#### 2.2.1 我方已经解码的信息

| 文件 | 我方解码结果 | 需甲方确认 |
|------|-------------|-----------|
| `4716063E.dat` (50.3 MB) | .NET BinaryFormatter 序列化，根类为 `GerberDb.GerberDbModel3` | 字段完整语义 |
| `ZoomTop.dat` / `ZoomBot.dat` | .NET BinaryFormatter，封装 `System.Drawing.Bitmap` | 图像用途 |
| `topStand.bmp` / `botStand.bmp` | 标准 BMP，2432×2803×24bit，300 DPI | 拍摄条件 |
| `板子类型.txt` | `luyou-baisewenzi-xiban-16-` | 编码规则 |
| `Image*.db` | .NET BinaryFormatter，根类为 `LibFailImageBmp.FailBmpHande` | 字段完整语义 |

#### 2.2.2 请甲方提供

1. **软件名称与版本**：`GerberDb` 和 `LibFailImageBmp` 两个 DLL 的来源？是否贵司自研？能否提供查看工具？
2. **字段完整定义**：见附录 A 中我方解析的字段清单，请一一标注业务含义
3. **Halcon 版本一致性**：我方检测到使用 **Halcon 19.11**（MVTec），请确认
4. **导出为开放格式的可能性**：能否将 `.dat` / `.db` 导出为 JSON / XML / CSV？

### 2.3 Statistics.csv 字段定义 ⚠️

`4716063LL/4716063扫描结果/Statistics.csv` 内容：`29,4,18,2`

我方猜测与验证：
- `29` 经统计验证 **等于 `annotated/` 目录下的图片数量** —— 可能是"总检出缺陷计数"
- `4` 未知（不等于算法数、不等于严重等级）
- `18` 未知（不等于 A2+B1 = 18）
  - **⚠️ 巧合**：A2 (8) + B1 (10) = **18**，可能是 A 类 + B1 类合计？
- `2` 可能是 B2 区域缺陷数（验证：B2 确实有 2 个）

**请确认**：
- 4 个数值的**精确定义**和**统计口径**
- 是否为 `[总数, X, A类, B2类]` 格式？

### 2.4 metadata.json 字段定义 ⚠️

`positions` 字段格式如 `"300:175:1475"`，我方通过对照 `annotated/` 图片上的文字标注（`Row:300 Col:175 Area:1475`）**已经解码**：

| 字段 | 含义 | 单位 | 验证方式 |
|------|------|------|---------|
| 第 1 段 `300` | Row（行坐标） | 像素 | 标注图文字确认 |
| 第 2 段 `175` | Col（列坐标） | 像素 | 标注图文字确认 |
| 第 3 段 `1475` | Area（面积） | 像素² | 标注图文字确认 |

**其他字段请甲方确认**：
- `pcb_index`（0~4）的编号规则：在大板中的物理位置映射？
- `img_no`（1~7）与拍摄顺序的关系
- `alg` 算法字段可能值的完整枚举

### 2.5 区域文件命名 `A2` / `B1` / `B2` ⚠️

`4716063扫描结果/` 下有 A2、B1、B2 三个目录，每个目录下有 1.txt ~ 7.txt（对应 7 个子区域）。

**请甲方说明**：
- A、B 代表什么分类维度？（如：A = Top，B = Bot？）
- 数字 1、2 代表什么？（如：严重等级？批次？）
- 为什么没有 A1、A3、B3 等？
- 子区域 1~7 与 `Image1~7` 是否对应？

### 2.6 板子类型编码 `luyou-baisewenzi-xiban-16-` ⚠️

我方推测（拼音解码）：
- `luyou` = 路由（板）？
- `baisewenzi` = 白色文字（白色丝印）？
- `xiban` = 锡板？西板？
- `16` = 层数？规格？

**请提供完整的板类型编码字典**。

---

## 三、交付格式与时间建议

### 3.1 交付物清单

| # | 交付物 | 建议格式 | 优先级 |
|---|--------|---------|--------|
| 1 | **缺陷类型字典** | PDF 或 Excel，含视觉示意图 | 🔴 高 |
| 2 | **文件格式规格说明** | PDF / Markdown，见附录 A | 🔴 高 |
| 3 | **Statistics.csv / metadata.json 字段定义** | 简短 PDF 或 Markdown | 🔴 高 |
| 4 | **数据查看工具**（能打开 .dat / .db） | 安装包 + 试用 License | 🟡 中 |
| 5 | **扩充缺陷数据集**（≥ 20 款板、数千张图） | ZIP，按 4716063LL 目录结构 | 🟡 中 |
| 6 | **良品（OK）图像数据集** | ZIP | 🟡 中 |
| 7 | **Gerber 字段命名规则说明** | Markdown | 🟢 低 |

### 3.2 分批交付建议

- **第 1 批（最紧急，1 周内）**：
  - 缺陷类型字典 + 字段定义说明
  - 不涉及大量数据打包，可短时间内给出

- **第 2 批（2-3 周）**：
  - 文件格式规格 + 数据查看工具
  - 若自研软件能直接导出 JSON 即可不必提供 DLL

- **第 3 批（1-2 个月）**：
  - 扩充缺陷数据集 + 良品图数据集

---

## 附录 A：我方逆向分析结果（供甲方核对与补充）

### A.1 文件格式总结

4716063LL 中的二进制文件全部为 **.NET BinaryFormatter 序列化对象**，经识别：

- 检测软件基于 **.NET Framework（C#）**
- 使用 **MVTec Halcon 19.11** 机器视觉库（`halcondotnetxl` v19.11.0.0）
- 使用 **Shalcondotnetxl** v19.11.0.0（推测是贵司对 Halcon 的封装）
- 使用 **自研 DLL**：`GerberDb` v1.0.0.0（PublicKeyToken=271d34586f8ae4e2）
- 使用 **自研 DLL**：`LibFailImageBmp` v1.0.0.0（无签名）

### A.2 `4716063E.dat` 解码结构

根类：`GerberDb.GerberDbModel3`

```csharp
class GerberDbModel3 {
    string ProjectName;           // 已解码: "4716063E"
    string Version;               // 已解码: "01"
    string DataTime;              // 已解码: "YY04DD175446" ← 含义待甲方说明
    List<RegionModel> TopProfileRegions;   // 顶面区域列表
    List<RegionModel> BotProfileRegions;   // 底面区域列表
    GerberDbModel2 GerberDbModelTop;       // 顶面 Halcon 图像
    GerberDbModel2 GerberDbModelBottom;    // 底面 Halcon 图像
    ? ZoomTopBitmap;                       // 可能引用 ZoomTop.dat
    ? ZoomBotBitmap;                       // 可能引用 ZoomBot.dat
    List<HRegion> TopMarkRegion;           // 顶面 Mark 点（Halcon 区域）
    List<HRegion> BotMarkRegion;           // 底面 Mark 点（Halcon 区域）
}

class GerberDbModel2 {
    ? Polarity;                            // 极性 (正/负片？)
    GerberDbModel1 GerberDbModel1;         // 嵌套模型
}

class GerberDbModel1 {
    string Name;                           // 图层名？
    string LayerName;                      // Gerber 层名
    GerberDbModel GerberDbModel;           // 更深层嵌套
}

class GerberDbModel {
    ? Region;                              // 区域数据
}

class RegionModel {
    // 结构待完整提取
}
```

**字段取值样例**（从 4716063E.dat 提取）:
- `ProjectName` = `"4716063E"`
- `Version` = `"01"`
- `DataTime` = `"YY04DD175446"`（疑似年月日时间戳，请甲方说明格式）

### A.3 `Image*.db` 解码结构

根类：`LibFailImageBmp.FailBmpHande`

```csharp
class FailBmpHande {
    ? pcbIndex;                           // PCB 索引 (0~4)
    bool isAIInspected;                   // ⭐ 是否 AI 已检测
    List<FailBmpMode> listFailTopBmp;     // 顶面缺陷列表
    List<FailBmpMode> listFailBotBmp;     // 底面缺陷列表
}

class FailBmpMode {
    string Label;                         // 标签
    Bitmap FailImage;                     // 缺陷裁切图
    ? NgPosition;                         // 缺陷位置
    string AlgName;                       // ⭐ 算法名 (斑点检测等)
    string NgDescription;                 // ⭐ 缺陷描述 (小尺寸通孔等)
    List<double> RadiusList;              // 半径列表
    List<int> RegionRowList;              // Row 像素坐标列表
    List<int> RegionColList;              // Col 像素坐标列表
    string FailInfo;                      // 缺陷额外信息
    List<List<Point>> AllRegionContousPoints;   // ⭐ 缺陷轮廓点（精确分割）
    List<List<Point>> AllRegionContousPoints2;
    ? OkNgOfAI;                           // ⭐ AI 的 OK/NG 判定
    ? AllFailRectangle;                   // 缺陷外接矩形
    ? AllFailRectangle2;
    string Messenge1, Messenge2, Messenge3; // (原文拼写错误: Message)
    string PcbProjectName;                // 如: "4716063E"
    string PcblotNum;                     // 批次号
    int PcbIndex;                         // 板内索引
    string FailImagePath;                 // 图像路径
    int PicNo;                            // 图像编号
    string FailImagePath2;
}
```

**重要发现**：`isAIInspected` 和 `OkNgOfAI` 字段表明贵司**已有 AI 视觉检测模块**。这对我方后续开发有重要参考价值，请确认：
1. 该 AI 模块基于什么框架？（PyTorch / ONNX / TensorRT / Halcon 深度学习？）
2. 4716063LL 的数据是否为该 AI 模块的输出？
3. 我方开发的 YOLO+VLM 系统是作为**替代方案**还是**补充方案**？

### A.4 `ZoomTop.dat` / `ZoomBot.dat` 解码结构

```csharp
// .NET BinaryFormatter serialized
System.Drawing.Bitmap {
    Data: byte[]    // 原始 BMP 数据
}
```

- 与 `topStand.bmp` / `botStand.bmp` 可能重复或不同分辨率
- 文件大小 ~1MB 远小于 BMP（20MB），可能是**低分辨率缩略图**用于快速对齐定位

### A.5 已解码的语义表

| 数据项 | 解码方法 | 结果 |
|--------|---------|------|
| `positions` 字段格式 `A:B:C` | 对照 `annotated/` 图上叠加文字 | Row:Col:Area（像素） |
| `Statistics.csv` 第 1 列 `29` | 与 annotated/ 文件数对照 | 缺陷标注图总数 |
| `APcbIndex.txt` = `7` | 与 metadata.json 图片数对照 | 总扫描图像数 |
| `img_no` (1~7) | 与 Image1.db ~ Image7.db 对照 | 图像序号 |
| 文件名 `Image3,8,1.db` | 拆解 | `Image{图号},{缺陷数},{PCB索引}` |
| 标注图命名 `ImageX_Y_Z_NN_面_NG` | 拆解 | `Image{图号}_{缺陷数}_{PCB索引}_{序号}_{面}_{状态}` |

---

## 附录 B：我方基础能力自述

为方便甲方评估，我方已具备的能力：

- ✅ 可解析 Gerber RS-274X 格式（CAM 文件）
- ✅ 可读取标准 BMP 图像
- ✅ 可识别 .NET BinaryFormatter 序列化文件的结构
- ✅ 具备 Python 深度学习开发能力（PyTorch / YOLO / VLM）
- ❓ 缺少 .NET / C# 环境（需甲方提供查看工具或导出开放格式）
- ❓ 无 Halcon License（如需完整读取 HImage/HRegion 数据，需授权）

---

## 附录 C：沟通建议

1. 如方便，可安排一次**技术对接会议**，由贵司工程师现场演示：
   - 如何用贵司软件打开 `4716063E.dat` / `Image*.db`
   - 如何理解 `luyou-baisewenzi-xiban-16-` 等编码含义
   - 缺陷类型字典的解读
2. 会议后若能提供**一小份 JSON 格式样例**（替代 .dat/.db 的 10~20 条记录），即可大幅加速我方开发

---

*文档版本：v1.0*
*编制日期：2026-04-14*
*参考样例：4716063LL（贵司先前交付）*
