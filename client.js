/**
 * Export center, browser half.
 *
 * Two independent blocks on one page:
 *
 *  1. Plugin inventory — pick the bundles to export, write them to a slim JSON
 *     manifest, and restore one written by this plugin on another machine by
 *     installing what this machine lacks (and enabling what it has switched off).
 *  2. Session archives — pick conversations (individually or by date) and read
 *     each one through the official `api/session.export` route, wrap those
 *     archives in one container ZIP, and download it. Import uploads that
 *     container to this bundle's Host half, which restores every Session with
 *     its attachments, subagents, original times, and target Workspace.
 *
 * Generated text (file name, archive README, manifest `about`) follows the
 * active interface language; Session content itself is never translated.
 *
 * Neither block depends on the other; each has its own export and import.
 */
window.__ModuleLoader__.load({
  id: 'dsh-export-center-plugin',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'exportCenter'
    const PANEL_ID = 'export-center'
    /** This package's own Loader name; also its `/plugins/<id>/` asset directory. */
    const PLUGIN_ID = 'dsh-export-center-plugin'
    /**
     * Build identity, rewritten by `_release.cjs` from package.json on every
     * release. The served bundle is the only file the Host guarantees it can
     * reach, so the version travels inside it rather than in a side asset.
     */
    const BUILD_VERSION = '0.4.1'

    const zh = {
      panel: '导出中心',
      title: '导出中心',
      subtitle: '两个互不影响的入口：插件清单、对话记录，各自可导出、可导入',
      refresh: '刷新',
      loading: '正在读取…',
      failed: '读取失败',

      plugins: '插件清单',
      pluginsHint: '勾选要导出的组合包；随 DSH 提供的官方组合包单独归组，不需要导出',
      officialGroup: '随 DSH 提供',
      officialHint: '由 DSH 安装包提供，或可从官方目录按需安装；不随清单流转',
      expand: '展开',
      collapse: '收起',
      planRest: '条无需处理',
      bundleOn: '已启用',
      bundleSelected: '已选',
      selectAll: '全选',
      selectEnabled: '仅已启用',
      selectNone: '清空',
      pluginsExport: '导出插件清单',
      pluginsImport: '导入插件清单',
      nothingSelected: '没有勾选任何条目',

      sessions: '对话记录',
      sessionsHint: '按标题搜索或按日期筛选，勾选要导出的会话',
      search: '搜索标题、目录或会话 ID',
      from: '开始日期',
      to: '结束日期',
      rangeToday: '今天',
      rangeWeek: '最近 7 天',
      rangeAll: '全部',
      selectFiltered: '全选筛选结果',
      clearSelection: '清空选择',
      sessionsExport: '导出会话包',
      sessionsImport: '导入会话包',
      archiveHint: '已保存：',
      archiveTooLarge: '会话包超过 200 MB 上限，请分批导出',
      archivePickHint: '选择导出中心生成的 .zip 会话包，在本机恢复为独立会话',
      restored: '已恢复',
      restoreTitle: '恢复结果',
      restoreAttachments: '附件：图片 / 文件',
      restoreFailures: '未恢复的条目',
      events: '事件',
      hostMissing: 'Host 半边未加载',
      hostMissingHint: 'Host 半边未加载（浏览器半边已是新版）：请重启 DSH 后再导入，否则导入无法工作',
      authFailed: '本机鉴权失败，请从本机页面重新打开后再试',
      authBanner: '本机鉴权失败：当前页面无法调用本机接口，请从本机重新打开 DSH 页面。',
      importTarget: '导入到工作区',
      duplicateArchive: '这份文件已导入过',
      duplicateHint: '这份归档之前已经导入过，本次又生成了一套新会话；如需避免重复，请先删除多余的那套。',
      attachmentsConverted: '无法作为图片保存、已按文件保存的附件',
      exportLanguage: '导出语言',
      sessionBackupTitle: 'DeepSeek Harness 会话备份',
      inventoryTitle: 'DeepSeek Harness 插件清单',
      archiveTool: '导出工具',
      archiveContent: '导出内容',
      archiveTime: '导出时间',
      archiveSource: '来源环境',
      archiveHowTo: '如何恢复',
      archiveSteps: '1. 在目标机器打开 导出中心 → 会话记录 → 导入会话包\n2. 选择本文件，并确认目标工作区\n3. 导入完成后会话出现在列表中，时间保持原始时间',
      archiveNotes: '说明',
      archiveNotePayload: '附件与子会话随包携带；无法作为图片保存的附件会按文件保存，并在导入报告中列出。',
      archiveNoteVersion: '导入需要 DeepSeek Harness 0.2.2-rc.5 或更高版本。',
      unitSessions: '个会话',
      unitAttachments: '个附件',
      unitSubagents: '个子会话',
      exportCancelled: '已取消导出',
      skippedTitle: '未导出的会话',
      skippedHint: '还有 {n} 个会话未导出，请分批导出',
      residualHint: '已创建但未写完的残留会话（请手动删除）',
      planManualHint: '条需手动处理，没有自动动作',
      cancel: '取消',
      applicationOverridden: '被上层覆盖',
      applicationCancelled: '已取消',
      showAllErrors: '显示全部',
      showLessErrors: '收起',
      workspaceFallback: '回退到第一个工作区',
      noSessions: '没有符合条件的会话',
      untitled: '未命名会话',
      noDate: '无时间',
      updated: '更新于',
      showAll: '显示全部',
      showLess: '收起',

      exporting: '正在读取会话',
      done: '已导出',
      doneSessions: '个会话',
      error: '失败',
      savedAs: '已请求保存',
      savedHint: '文件由浏览器保存（默认在「下载」目录），文件名：',
      hiddenSelected: '条已选但被当前筛选隐藏',

      importPlan: '导入计划',
      importApply: '开始安装',
      importImporting: '正在安装',
      importEmpty: '这份文件里没有可安装的插件',
      importNone: '未选择文件',
      importDone: '导入完成',
      importStateInstall: '待安装',
      importStateEnable: '已存在，待启用',
      importStateAlready: '已一致',
      importStateDifferent: '版本不同',
      importStateShipped: '随 DSH 提供',
      importStateDisabled: '导出中未启用',
      importStateManual: '需手动搬',

      sessionOpen: '在新会话中打开',
      planPick: '勾选要执行的条目',
      planSelected: '已选',
      planMore: '还有',
      planMoreRows: '条未展开',
      planShowAll: '显示全部',
      planShowLess: '收起',
      planFailed: '失败原因',
      versionTitle: '插件版本',
      versionSource: '来源',
      updateAvailable: '目录里的版本比正在运行的新',
      updateHint: '改完插件代码后，界面内的热更新由 HMR 自动完成；重启 DSH 会加载完整的新代码',
      hotRebuilt: '检测到插件代码已更新',
      hotReloadNow: '重新读取数据',
      hotReloadPage: '重新加载页面',
    }

    const en = {
      panel: 'Export center',
      title: 'Export center',
      subtitle: 'Two independent entries: plugin inventory and Session logs, each with its own export and import',
      refresh: 'Refresh',
      loading: 'Reading…',
      failed: 'Read failed',

      plugins: 'Plugin inventory',
      pluginsHint: 'Tick the bundles to export; bundles that ship with DSH are grouped apart and need no export',
      officialGroup: 'Ships with DSH',
      officialHint: 'Provided by the DSH installation, or installable from the official catalog on demand; they never travel in a manifest',
      expand: 'Show',
      collapse: 'Hide',
      planRest: 'rows need no action',
      bundleOn: 'enabled',
      bundleSelected: 'selected',
      selectAll: 'All',
      selectEnabled: 'Enabled only',
      selectNone: 'Clear',
      pluginsExport: 'Export plugins',
      pluginsImport: 'Import plugins',
      nothingSelected: 'Nothing is ticked',

      sessions: 'Session logs',
      sessionsHint: 'Search by title or filter by date, then tick the Sessions to export',
      search: 'Search title, directory or Session ID',
      from: 'From',
      to: 'To',
      rangeToday: 'Today',
      rangeWeek: 'Last 7 days',
      rangeAll: 'All',
      selectFiltered: 'Select filtered',
      clearSelection: 'Clear',
      sessionsExport: 'Export sessions',
      sessionsImport: 'Import sessions',
      archiveHint: 'saved as:',
      archiveTooLarge: 'the archive exceeds the 200 MB limit; export in smaller batches',
      archivePickHint: 'Choose a .zip session package written by the export center to restore its Sessions here',
      restored: 'Restored',
      restoreTitle: 'Restore result',
      restoreAttachments: 'attachments: images / files',
      restoreFailures: 'not restored',
      events: 'events',
      hostMissing: 'Host half not loaded',
      hostMissingHint: 'The Host half is not loaded (the browser half is already updated). Restart DSH, then import again; import cannot work before that.',
      authFailed: 'This page is not authenticated for this machine; reopen it and retry',
      authBanner: 'This page could not authenticate against the local Host. Reopen the DSH page on this machine.',
      importTarget: 'Import into workspace',
      duplicateArchive: 'this archive was imported before',
      duplicateHint: 'This archive had already been imported; this run created another set of Sessions. Delete the extra set if you did not mean to.',
      attachmentsConverted: 'attachments stored as files because the image store refused them',
      exportLanguage: 'Export language',
      sessionBackupTitle: 'DeepSeek Harness session backup',
      inventoryTitle: 'DeepSeek Harness plugin inventory',
      archiveTool: 'Exported by',
      archiveContent: 'Contents',
      archiveTime: 'Exported at',
      archiveSource: 'Source environment',
      archiveHowTo: 'How to restore',
      archiveSteps: '1. On the target machine open Export center → Session logs → Import sessions\n2. Choose this file and confirm the target workspace\n3. Restored Sessions appear in the list with their original times',
      archiveNotes: 'Notes',
      archiveNotePayload: 'Attachments and subagent sessions travel inside this archive; attachments the image store refuses are saved as files and listed in the import report.',
      archiveNoteVersion: 'Import requires DeepSeek Harness 0.2.2-rc.5 or newer.',
      unitSessions: ' sessions',
      unitAttachments: ' attachments',
      unitSubagents: ' subagent sessions',
      exportCancelled: 'export cancelled',
      skippedTitle: 'Sessions not exported',
      skippedHint: '{n} Sessions were not exported; export them in a smaller batch',
      residualHint: 'Sessions created but not finished (delete them manually)',
      planManualHint: 'rows need manual handling and have no automatic action',
      cancel: 'Cancel',
      applicationOverridden: 'overridden by a higher layer',
      applicationCancelled: 'cancelled',
      showAllErrors: 'Show all',
      showLessErrors: 'Show fewer',
      workspaceFallback: 'fell back to the first workspace',
      noSessions: 'No Session matches',
      untitled: 'Untitled Session',
      noDate: 'no time',
      updated: 'updated',
      showAll: 'Show all',
      showLess: 'Show fewer',

      exporting: 'Reading sessions',
      done: 'Exported',
      doneSessions: 'sessions',
      error: 'failed',
      savedAs: 'Save requested',
      savedHint: 'the browser saves it for you (Downloads by default), file name:',
      hiddenSelected: 'picked but hidden by the current filter',

      importPlan: 'Import plan',
      importApply: 'Install',
      importImporting: 'Installing',
      importEmpty: 'nothing in this file can be installed here',
      importNone: 'no file chosen',
      importDone: 'Import finished',
      importStateInstall: 'to install',
      importStateEnable: 'present, to enable',
      importStateAlready: 'same version',
      importStateDifferent: 'different version',
      importStateShipped: 'ships with DSH',
      importStateDisabled: 'off on the source machine',
      importStateManual: 'copy manually',

      sessionOpen: 'Open in a new Session',
      planPick: 'Tick the rows to apply',
      planSelected: 'selected',
      planMore: 'and',
      planMoreRows: 'more rows',
      planShowAll: 'Show all',
      planShowLess: 'Show fewer',
      planFailed: 'failure',
      versionTitle: 'Plugin version',
      versionSource: 'source',
      updateAvailable: 'the directory holds a newer version than the running code',
      updateHint: 'HMR swaps the browser half in place; a DSH restart loads the complete new code',
      hotRebuilt: 'newer plugin code was detected',
      hotReloadNow: 'Reload data',
      hotReloadPage: 'Reload page',
    }


    /** Largest session archive this page builds or uploads, in bytes. */
    const ARCHIVE_LIMIT = 200 * 1024 * 1024

    /** Read `result.value`, or throw the Remote failure. */
    function unwrap(result, fallbackMessage) {
      if (result && result.ok === true) return result.value
      const error = result && result.error
      throw new Error((error && (error.message || error.code)) || fallbackMessage)
    }

    /** Find a display title anywhere a Session summary may carry one. */
    function pickTitle(row) {
      if (!row || typeof row !== 'object') return ''
      if (typeof row.title === 'string' && row.title.trim() !== '') return row.title
      const values = row.projections && row.projections.values
      const search = (value, depth) => {
        if (depth > 3 || value === null || typeof value !== 'object') return ''
        if (Array.isArray(value)) return ''
        for (const key of Object.keys(value)) {
          const child = value[key]
          if ((key === 'title' || key === 'text') && typeof child === 'string' && child.trim() !== '') return child
          const nested = search(child, depth + 1)
          if (nested !== '') return nested
        }
        return ''
      }
      return search(values, 0) || ''
    }

    /** Normalize a Session timestamp to milliseconds. */
    function toMillis(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
      return value < 1e12 ? value * 1000 : value
    }

    /** Format a millisecond timestamp for display. */
    function formatTime(ms) {
      if (ms === 0) return ''
      const date = new Date(ms)
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** Normalize the pluginManager listBundles answer into an entry array. */
    function bundleEntries(value) {
      if (Array.isArray(value)) return value
      if (value && Array.isArray(value.entries)) return value.entries
      if (value && Array.isArray(value.items)) return value.items
      return []
    }

    /** Resolve a localized display string (plain string or language map). */
    function localize(value) {
      if (typeof value === 'string') return value
      if (!value || typeof value !== 'object') return ''
      const tag = typeof navigator !== 'undefined' && navigator && typeof navigator.language === 'string'
        ? navigator.language.slice(0, 2).toLowerCase()
        : ''
      const table = value
      return table[tag] || table.zh || table.en || Object.values(table).find((item) => typeof item === 'string') || ''
    }

    /** Human-readable title for a bundle entry, falling back to its package name. */
    function bundleTitle(entry) {
      if (!entry || typeof entry !== 'object') return ''
      return localize(entry.meta && entry.meta.title) || entry.name
    }

    /**
     * Split bundle entries into the ones a manifest can carry and the ones the
     * installation already provides.
     * @param entries - bundle entries from the plugin manager.
     * @returns the portable entries and the installation-provided ones.
     */
    function splitBundles(entries) {
      const migratable = []
      const shipped = []
      for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue
        // Only a profile dependency is something a manifest can restore: it has a
        // recorded install source. `installation` bundles ship with DSH, and
        // `missing` entries are the official on-demand catalog — including an
        // official bundle the profile installed earlier, whose package still
        // resolves from the installation and therefore records no source.
        const official = entry.availability !== 'profile'
        if (official) shipped.push(entry)
        else migratable.push(entry)
      }
      return { migratable, shipped }
    }

    /** Normalize the session list answer into rows. */
    function sessionRows(value) {
      if (Array.isArray(value)) return value
      if (value && Array.isArray(value.items)) return value.items
      if (value && Array.isArray(value.rows)) return value.rows
      return []
    }

    /** Exact registry spec for a profile bundle, or null when the source is not a registry range. */
    function exactSpec(entry) {
      const source = entry && entry.source
      const name = entry && entry.name
      const version = entry && entry.version
      if (typeof source !== 'string' || typeof name !== 'string' || typeof version !== 'string') return null
      if (source.startsWith('link:') || source.startsWith('file:') || source.startsWith('git+')
        || source.includes('://') || source.includes('npm:')
        || /^(github|gitlab|bitbucket|workspace):/.test(source)) return null
      return `${name}@${version}`
    }

    /** Classify how a bundle was installed on the source machine. */
    function sourceKindOf(entry) {
      if (exactSpec(entry) !== null) return 'registry'
      const source = entry && typeof entry.source === 'string' ? entry.source : ''
      if (source.startsWith('link:')) return 'link'
      if (source.startsWith('file:')) return 'file'
      if (source.startsWith('git+') || /^(github|gitlab|bitbucket):/.test(source)) return 'git'
      if (entry && entry.installTarget !== undefined) return 'catalog'
      return 'unknown'
    }

    /** Compare an exported bundle list with the local one and decide what each entry needs. */
    function buildPlan(exported, installed) {
      const byName = new Map()
      for (const entry of installed) {
        if (entry && typeof entry.name === 'string') byName.set(entry.name, entry)
      }
      const items = []
      for (const entry of exported) {
        if (!entry || typeof entry.name !== 'string') continue
        const title = bundleTitle(entry)
        const version = entry.version
        const kind = typeof entry.sourceKind === 'string' ? entry.sourceKind : sourceKindOf(entry)
        // A bundle the source machine had switched off is not part of what to restore.
        if (entry.enabled !== true) {
          items.push({ name: entry.name, title, version, spec: null, state: 'disabled', sourceKind: kind })
          continue
        }
        // Anything the installation provides, or the official catalog offers on
        // demand, is present on every machine one way or another.
        if (entry.availability !== undefined && entry.availability !== 'profile') {
          items.push({ name: entry.name, title, version, spec: null, state: 'shipped', sourceKind: kind })
          continue
        }
        const target = entry.installTarget
        const spec = typeof entry.spec === 'string' && entry.spec !== ''
          ? entry.spec
          : (exactSpec(entry) || (target && typeof target.spec === 'string' ? target.spec : null))

        if (spec === null) {
          items.push({
            name: entry.name, title, version, spec: null, state: 'manual',
            sourceKind: kind, note: entry.source || kind,
          })
          continue
        }
        const local = byName.get(entry.name)
        if (local && local.version === version) {
          items.push({
            name: entry.name, title, version, spec, sourceKind: kind,
            state: local.enabled === true ? 'already' : 'enable',
          })
          continue
        }
        if (local) {
          items.push({
            name: entry.name, title, version, spec, sourceKind: kind,
            state: 'different', note: String(local.version),
          })
          continue
        }
        items.push({ name: entry.name, title, version, spec, sourceKind: kind, state: 'install' })
      }
      return items
    }

    /** Hand one text file to the browser's download path; returns the file name. */
    function saveFile(text, name, mime) {
      const blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 20000)
      return name
    }


    /** Active UI language, collapsed to the two locales this bundle ships. */
    function activeLanguage(ctx) {
      try {
        const snapshot = ctx.locale && typeof ctx.locale.getSnapshot === 'function' ? ctx.locale.getSnapshot() : undefined
        const active = snapshot && typeof snapshot.active === 'string' ? snapshot.active : ''
        if (active !== '') return active.toLowerCase().startsWith('zh') ? 'zh' : 'en'
      } catch (error) {
        // Fall through to the browser language.
      }
      const browser = typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : ''
      return browser.toLowerCase().startsWith('zh') ? 'zh' : 'en'
    }

    /** Local clock facts for one export: display text, offset, IANA zone, ISO string. */
    function exportClock(date) {
      const pad = (n) => String(n).padStart(2, '0')
      const minutes = -date.getTimezoneOffset()
      const sign = minutes >= 0 ? '+' : '-'
      const offset = `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`
      const display = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      let timeZone = ''
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      } catch (error) {
        timeZone = ''
      }
      return { display, offset, timeZone, iso: `${display.replace(' ', 'T')}${offset}` }
    }

    /** Hex SHA-256 of one byte array, or an empty string without WebCrypto. */
    async function digestHex(bytes) {
      if (typeof crypto === 'undefined' || crypto.subtle === undefined) return ''
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
      return Array.from(digest, (value) => value.toString(16).padStart(2, '0')).join('')
    }

    /**
     * Human-readable README placed inside a Session archive.
     * @param t - translation function.
     * @param locale - `zh` or `en`, deciding the punctuation and the words.
     * @param facts - tool, content, time, source, and note lines.
     * @returns the Markdown document.
     */
    function archiveReadme(t, locale, facts) {
      const colon = locale === 'zh' ? '：' : ': '
      return [
        `# ${t('sessionBackupTitle')}`,
        '',
        `- ${t('archiveTool')}${colon}${facts.tool}`,
        `- ${t('archiveContent')}${colon}${facts.content}`,
        `- ${t('archiveTime')}${colon}${facts.time}`,
        `- ${t('archiveSource')}${colon}${facts.source}`,
        '',
        `## ${t('archiveHowTo')}`,
        '',
        t('archiveSteps'),
        '',
        `## ${t('archiveNotes')}`,
        '',
        `- ${t('archiveNotePayload')}`,
        `- ${t('archiveNoteVersion')}`,
        '',
      ].join('\n')
    }
    function saveBinary(bytes, name, mime) {
      const blob = new Blob([bytes], { type: mime || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
      return name
    }

    /** CRC-32 lookup table shared by the ZIP writer. */
    const CRC_TABLE = (() => {
      const table = new Uint32Array(256)
      for (let index = 0; index < 256; index += 1) {
        let value = index
        for (let bit = 0; bit < 8; bit += 1) {
          value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
        }
        table[index] = value >>> 0
      }
      return table
    })()

    /** CRC-32 of one byte array. */
    function crc32(bytes) {
      let value = 0xffffffff
      for (let index = 0; index < bytes.length; index += 1) {
        value = CRC_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8)
      }
      return (value ^ 0xffffffff) >>> 0
    }

    /** Concatenate byte arrays. */
    function joinBytes(chunks) {
      let total = 0
      for (const chunk of chunks) total += chunk.length
      const out = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.length
      }
      return out
    }

    /**
     * Build an uncompressed ZIP archive from in-memory entries.
     * Session packages are already compressed, so storing them keeps the
     * browser writer small and the archive byte-for-byte copyable.
     * @param entries - `[name, bytes]` pairs in output order.
     * @returns the archive bytes.
     */
    function zipStore(entries) {
      const encoder = new TextEncoder()
      const parts = []
      const central = []
      let offset = 0
      for (const [name, bytes] of entries) {
        const nameBytes = encoder.encode(name)
        const crc = crc32(bytes)
        const local = new Uint8Array(30 + nameBytes.length)
        const localView = new DataView(local.buffer)
        localView.setUint32(0, 0x04034b50, true)
        localView.setUint16(4, 20, true)
        localView.setUint16(6, 0x0800, true)
        localView.setUint16(8, 0, true)
        localView.setUint16(10, 0, true)
        localView.setUint16(12, 0, true)
        localView.setUint32(14, crc, true)
        localView.setUint32(18, bytes.length, true)
        localView.setUint32(22, bytes.length, true)
        localView.setUint16(26, nameBytes.length, true)
        localView.setUint16(28, 0, true)
        local.set(nameBytes, 30)
        parts.push(local, bytes)
        const directory = new Uint8Array(46 + nameBytes.length)
        const directoryView = new DataView(directory.buffer)
        directoryView.setUint32(0, 0x02014b50, true)
        directoryView.setUint16(4, 20, true)
        directoryView.setUint16(6, 20, true)
        directoryView.setUint16(8, 0x0800, true)
        directoryView.setUint16(10, 0, true)
        directoryView.setUint16(12, 0, true)
        directoryView.setUint16(14, 0, true)
        directoryView.setUint32(16, crc, true)
        directoryView.setUint32(20, bytes.length, true)
        directoryView.setUint32(24, bytes.length, true)
        directoryView.setUint16(28, nameBytes.length, true)
        directoryView.setUint16(30, 0, true)
        directoryView.setUint16(32, 0, true)
        directoryView.setUint16(34, 0, true)
        directoryView.setUint16(36, 0, true)
        directoryView.setUint32(38, 0, true)
        directoryView.setUint32(42, offset, true)
        directory.set(nameBytes, 46)
        central.push(directory)
        offset += local.length + bytes.length
      }
      const directoryBytes = joinBytes(central)
      const end = new Uint8Array(22)
      const endView = new DataView(end.buffer)
      endView.setUint32(0, 0x06054b50, true)
      endView.setUint16(8, entries.length, true)
      endView.setUint16(10, entries.length, true)
      endView.setUint32(12, directoryBytes.length, true)
      endView.setUint32(16, offset, true)
      return joinBytes([...parts, directoryBytes, end])
    }

    const styles = {
      page: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        color: 'inherit',
        fontSize: '13px',
        lineHeight: 1.5,
      },
      scroller: {
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarGutter: 'stable',
      },
      content: { padding: '24px 28px 40px', maxWidth: '920px' },
      headerRow: { display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' },
      title: { fontSize: '18px', fontWeight: 600, margin: 0 },
      subtitle: { opacity: 0.62, margin: '4px 0 20px' },
      section: {
        border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.28))',
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '18px',
      },
      sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' },
      hint: { opacity: 0.6, margin: '0 0 10px', fontSize: '12px' },
      toolbar: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' },
      sectionFooter: {
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
        marginTop: '12px', paddingTop: '12px',
        borderTop: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.2))',
      },
      input: {
        padding: '5px 8px',
        border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.35))',
        borderRadius: '6px',
        background: 'transparent',
        color: 'inherit',
        fontSize: '12px',
      },
      button: {
        padding: '5px 10px',
        border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.35))',
        borderRadius: '6px',
        background: 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: '12px',
      },
      primary: {
        padding: '7px 16px',
        border: '1px solid var(--dsw-alias-state-business-primary, #2f6feb)',
        borderRadius: '6px',
        background: 'var(--dsw-alias-state-business-primary, #2f6feb)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
      },
      list: { margin: '8px 0 0' },
      row: { display: 'flex', gap: '8px', alignItems: 'baseline', padding: '3px 0' },
      rowTitle: { flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      mono: { opacity: 0.55, fontSize: '11px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
      status: { margin: '10px 0 0', opacity: 0.75, fontSize: '12px' },
      preview: {
        margin: '10px 0',
        padding: '10px 12px',
        border: '1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
        borderRadius: '8px',
        background: 'rgba(127,127,127,0.06)',
      },
      danger: { color: 'var(--dsw-alias-state-error-primary, #d1493f)' },
    }

    /**
     * Build the panel page bound to one Client context.
     * @param ctx - the browser plugin context.
     */
    function createPage(ctx) {
      const t = ctx.locale.bind(NS)

      return function ExportCenter() {
        const [pluginStatus, setPluginStatus] = React.useState('loading')
        const [pluginError, setPluginError] = React.useState(null)
        const [sessionStatus, setSessionStatus] = React.useState('loading')
        const [sessionError, setSessionError] = React.useState(null)
        const [bundles, setBundles] = React.useState([])
        const [bundlePicked, setBundlePicked] = React.useState(() => new Set())
        const [showOfficial, setShowOfficial] = React.useState(false)
        const [pluginBusy, setPluginBusy] = React.useState(null)
        const [pluginMessage, setPluginMessage] = React.useState(null)
        const [importPlan, setImportPlan] = React.useState(null)
        const [importBusy, setImportBusy] = React.useState(null)
        const [importMessage, setImportMessage] = React.useState(null)
        const [importResults, setImportResults] = React.useState(null)
        const [planExpanded, setPlanExpanded] = React.useState(false)

        const [sessions, setSessions] = React.useState([])
        const [query, setQuery] = React.useState('')
        const [from, setFrom] = React.useState('')
        const [to, setTo] = React.useState('')
        const [selected, setSelected] = React.useState(() => new Set())
        const [sessionBusy, setSessionBusy] = React.useState(null)
        const [sessionMessage, setSessionMessage] = React.useState(null)
        const [restoreReport, setRestoreReport] = React.useState(null)
        const [hostReady, setHostReady] = React.useState(true)
        const [authIssue, setAuthIssue] = React.useState(false)
        const [showAllFailures, setShowAllFailures] = React.useState(false)
        const [workspaces, setWorkspaces] = React.useState([])
        const [targetWorkspace, setTargetWorkspace] = React.useState('')
        const [duplicateWarning, setDuplicateWarning] = React.useState(false)
        const [showAll, setShowAll] = React.useState(false)
        const [showVersion, setShowVersion] = React.useState(false)
        const [hotRebuilt, setHotRebuilt] = React.useState(false)
        const pluginFileRef = React.useRef(null)
        const sessionFileRef = React.useRef(null)
        const cancelRef = React.useRef(null)
        const exportAbort = React.useRef(null)
        const importAbort = React.useRef(null)

        const loadPlugins = React.useCallback(async () => {
          setPluginStatus('loading')
          setPluginError(null)
          try {
            const result = await ctx.remote.pluginManager.listBundles()
            const entries = bundleEntries(unwrap(result, 'plugin list failed'))
            setBundles(entries)
            const migratable = splitBundles(entries).migratable
            setBundlePicked((previous) => {
              // Keep the user's ticks across a refresh, dropping names that left.
              const names = new Set(migratable.map((entry) => entry.name))
              const kept = [...previous].filter((name) => names.has(name))
              if (kept.length > 0) return new Set(kept)
              return new Set(migratable.filter((entry) => entry.enabled === true).map((entry) => entry.name))
            })
            setPluginStatus('ready')
          } catch (failure) {
            setPluginError(failure && failure.message ? failure.message : String(failure))
            setPluginStatus('error')
          }
        }, [])

        const loadSessions = React.useCallback(async () => {
          setSessionStatus('loading')
          setSessionError(null)
          try {
            const result = await ctx.remote.session.list({})
            setSessions(sessionRows(unwrap(result, 'session list failed')))
            setSessionStatus('ready')
          } catch (failure) {
            setSessionError(failure && failure.message ? failure.message : String(failure))
            setSessionStatus('error')
          }
        }, [])

        // The Host half only loads at DSH boot, so a half-updated plugin shows a
        // v0.3.0 panel whose import route does not exist yet. Probe it on load and
        // say so before the user clicks Import.
        const loadHost = React.useCallback(async () => {
          try {
            const response = await fetch('api/export-center.workspaces', { headers: { accept: 'application/json' } })
            if (response.status === 404) {
              setHostReady(false)
              setAuthIssue(false)
              return
            }
            if (response.status === 401 || response.status === 403) {
              // Authentication runs before routing: a 401 says nothing about
              // whether the Host half is mounted, so report the real cause.
              setHostReady(false)
              setAuthIssue(true)
              return
            }
            setHostReady(response.ok)
            setAuthIssue(false)
            if (!response.ok) return
            const value = await response.json().catch(() => null)
            const list = value && Array.isArray(value.workspaces) ? value.workspaces : []
            setWorkspaces(list)
            setTargetWorkspace((previous) => (previous !== '' ? previous : (list[0] ? list[0].id : '')))
          } catch (failure) {
            setHostReady(false)
            setAuthIssue(false)
          }
        }, [])

        // The two blocks load independently: one Remote failing must not hide
        // the other block's already usable data.
        const load = React.useCallback(async () => {
          await Promise.all([loadPlugins(), loadSessions(), loadHost()])
        }, [loadPlugins, loadSessions, loadHost])

        React.useEffect(() => {
          load()
        }, [load])

        // Notice when the Host published a newer bundle revision while this page
        // kept running: HMR normally swaps it, but a manual reload is the escape
        // hatch when the swap did not happen.
        React.useEffect(() => {
          const scheme = typeof location !== 'undefined' ? location.protocol : 'http:'
          const host = typeof location !== 'undefined' ? location.host : ''
          if (host === '' || typeof EventSource !== 'function') return undefined
          let source
          try {
            source = new EventSource(`${scheme}//${host}/plugins/events`)
          } catch (error) {
            return undefined
          }
          let baseline = null
          const onFrame = (event) => {
            let parsed
            try {
              parsed = JSON.parse(event.data)
            } catch (error) {
              return
            }
            if (parsed.type !== 'graph') return
            const row = (parsed.graph && parsed.graph.entries || [])
              .find((entry) => entry.id === PLUGIN_ID)
            const rev = row ? row.rev : null
            if (baseline === null) {
              baseline = rev
              return
            }
            if (rev !== null && rev !== baseline) setHotRebuilt(true)
          }
          source.addEventListener('message', onFrame)
          return () => source.close()
        }, [])

        const rows = React.useMemo(() => sessions.map((row) => ({          id: row.sessionId,
          title: pickTitle(row) || t('untitled'),
          ms: toMillis(row.updatedAt),
          cwd: row.cwd || '',
        })), [sessions, t])

        const filtered = React.useMemo(() => {
          const needle = query.trim().toLowerCase()
          const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null
          const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null
          return rows.filter((row) => {
            if (needle !== '') {
              const haystack = `${row.title} ${row.cwd} ${row.id}`.toLowerCase()
              if (!haystack.includes(needle)) return false
            }
            if (fromMs !== null || toMs !== null) {
              if (row.ms === 0) return false
              if (fromMs !== null && row.ms < fromMs) return false
              if (toMs !== null && row.ms > toMs) return false
            }
            return true
          })
        }, [rows, query, from, to])

        const visible = showAll ? filtered : filtered.slice(0, 50)
        const selectedCount = selected.size

        // A selection made under one filter may not be visible under the next.
        // It is kept (ticking, then narrowing by date is the normal flow) but the
        // footer states how many picked rows the current filter hides, so the
        // export never ships conversations the user cannot see without saying so.
        const filteredIds = new Set(filtered.map((row) => row.id))
        let hiddenSelected = 0
        for (const id of selected) if (!filteredIds.has(id)) hiddenSelected += 1
        const toggleBundle = (name) => {
          setBundlePicked((previous) => {
            const next = new Set(previous)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
          })
        }

        const toggleSession = (id) => {
          setSelected((previous) => {
            const next = new Set(previous)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }

        const selectFiltered = () => {
          setSelected((previous) => {
            const next = new Set(previous)
            for (const row of filtered) next.add(row.id)
            return next
          })
        }

        const clearSelection = () => setSelected(new Set())

        /** Stop the running export or import. */
        const cancelBusy = () => {
          cancelRef.current = 'export'
          if (exportAbort.current !== null) exportAbort.current.abort()
          if (importAbort.current !== null) importAbort.current.abort()
        }

        /** Flip one installable plan row's checkbox. */
        const togglePlanItem = (name) => {
          setImportPlan((previous) => previous === null ? previous : {
            ...previous,
            items: previous.items.map((item) => item.name === name
              ? { ...item, checked: item.checked === false }
              : item),
          })
        }

        const applyRange = (days) => {
          if (days === null || days === undefined) {
            setFrom('')
            setTo('')
            return
          }
          const today = new Date()
          const start = new Date(today)
          start.setDate(start.getDate() - (days - 1))
          const iso = (date) => {
            const pad = (value) => String(value).padStart(2, '0')
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
          }
          setFrom(iso(start))
          setTo(iso(today))
        }

        /* ---------- plugin inventory: export ---------- */

        const exportPlugins = () => {
          const chosen = bundles
            .filter((entry) => entry && bundlePicked.has(entry.name))
            .map((entry) => ({
              name: entry.name,
              version: typeof entry.version === 'string' ? entry.version : null,
              availability: entry.availability,
              enabled: entry.enabled === true,
              sourceKind: sourceKindOf(entry),
              spec: exactSpec(entry),
            }))
          if (chosen.length === 0) {
            setPluginMessage({ kind: 'info', text: t('nothingSelected') })
            return
          }
          const locale = activeLanguage(ctx)
          const started = new Date()
          const clock = exportClock(started)
          const payload = {
            kind: 'dsh-export-center/plugins',
            version: 2,
            locale,
            exportedAt: clock.iso,
            timeZone: clock.timeZone,
            about: locale === 'zh'
              ? `本文件由 ${t('title')} ${BUILD_VERSION} 从 DeepSeek Harness 于 ${clock.display}（UTC${clock.offset}）导出，含 ${chosen.length} 个插件。`
              : `Exported by ${t('title')} ${BUILD_VERSION} from DeepSeek Harness on ${clock.display} (UTC${clock.offset}); ${chosen.length} plugins.`,
            host: { platform: typeof navigator !== 'undefined' ? String(navigator.platform || '') : '' },
            bundles: chosen,
          }
          const stamp = `${started.getFullYear()}${String(started.getMonth() + 1).padStart(2, '0')}${String(started.getDate()).padStart(2, '0')}-${String(started.getHours()).padStart(2, '0')}${String(started.getMinutes()).padStart(2, '0')}`
          const prefix = locale === 'zh' ? '插件清单' : 'plugin-inventory'
          const name = saveFile(
            JSON.stringify(payload, null, 2),
            `${prefix}-${stamp}.json`,
            'application/json;charset=utf-8',
          )
          setPluginMessage({ kind: 'info', text: `${t('done')} ${chosen.length} · ${t('savedHint')}${name}` })
        }

        /* ---------- plugin inventory: import ---------- */

        const onPickPluginFile = async (event) => {
          const input = event.target
          const file = input.files && input.files[0]
          if (!file) return
          setImportMessage(null)
          try {
            const parsed = JSON.parse(await file.text())
            const kind = parsed && parsed.kind
            if (kind !== 'dsh-export-center/plugins' && kind !== 'dsh-export-plugins' && kind !== 'dsh-export') {
              throw new Error('not a plugin inventory file')
            }
            const items = buildPlan(Array.isArray(parsed.bundles) ? parsed.bundles : [], bundles)
              .map((item) => ({ ...item, checked: item.state === 'install' || item.state === 'enable' }))
            setImportPlan({ fileName: file.name, items })
            setImportResults(null)
            setPlanExpanded(false)
            if (items.every((item) => item.state !== 'install' && item.state !== 'enable')) {
              setImportMessage({ kind: 'info', text: t('importEmpty') })
            }
          } catch (failure) {
            setImportPlan(null)
            setImportMessage({ kind: 'error', text: failure && failure.message ? failure.message : String(failure) })
          } finally {
            if (input.value !== undefined) input.value = ''
          }
        }

        const runPluginImport = async () => {
          const pending = (importPlan ? importPlan.items : [])
            .filter((item) => (item.state === 'install' || item.state === 'enable') && item.checked !== false)
          if (pending.length === 0) {
            setImportMessage({ kind: 'info', text: t('importEmpty') })
            return
          }
          setImportBusy({ done: 0, total: pending.length })
          setImportMessage(null)
          setImportResults(null)
          const counts = { applied: 0, restart: 0, overridden: 0, cancelled: 0, failed: 0 }
          const failedItems = []
          const tally = (item, value) => {
            const application = value && typeof value.application === 'string' ? value.application : 'unknown'
            if (application === 'applied') counts.applied += 1
            else if (application === 'restart-required') counts.restart += 1
            else if (application === 'overridden') counts.overridden += 1
            else if (application === 'cancelled') counts.cancelled += 1
            else {
              counts.failed += 1
              failedItems.push({ name: item.name, reason: `application: ${application}` })
            }
          }
          for (let index = 0; index < pending.length; index += 1) {
            const item = pending[index]
            try {
              if (item.state === 'enable') {
                tally(item, unwrap(await ctx.remote.pluginManager.setBundleEnabled(item.name, true), 'enable failed'))
              } else {
                const answer = await ctx.remote.pluginManager.installBundle(item.spec, {
                  enabled: true,
                  requestId: typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${index}`,
                })
                tally(item, unwrap(answer, 'install failed'))
              }
            } catch (failure) {
              counts.failed += 1
              failedItems.push({ name: item.name, reason: failure && failure.message ? failure.message : String(failure) })
            }
            setImportBusy({ done: index + 1, total: pending.length })
          }
          setImportBusy(null)
          setImportResults(failedItems)
          setImportMessage({
            kind: counts.failed > 0 ? 'error' : 'info',
            text: `${t('importDone')}: ${counts.applied} ✓ · ${counts.restart} ⟳`
              + (counts.overridden > 0 ? ` · ${counts.overridden} ${t('applicationOverridden')}` : '')
              + (counts.cancelled > 0 ? ` · ${counts.cancelled} ${t('applicationCancelled')}` : '')
              + ` · ${counts.failed} ✕`,
          })
          await load()
        }

        /* ---------- session logs: export ---------- */

        /** Read one Session's official export archive (logs, subagents, attachments). */
        const fetchSessionArchive = async (id, signal) => {
          const route = `api/session.export?sessionId=${encodeURIComponent(id)}&includeDescendants=true`
          const response = await fetch(route, { headers: { accept: 'application/zip' }, signal })
          if (!response.ok) {
            const detail = await response.text().catch(() => '')
            throw new Error(`HTTP ${response.status}${detail === '' ? '' : ` ${detail.slice(0, 160)}`}`)
          }
          return new Uint8Array(await response.arrayBuffer())
        }

        const exportSessions = async () => {
          const ids = Array.from(selected)
          if (ids.length === 0) {
            setSessionMessage({ kind: 'info', text: t('nothingSelected') })
            return
          }
          const locale = activeLanguage(ctx)
          const started = new Date()
          const clock = exportClock(started)
          setSessionBusy({ done: 0, total: ids.length })
          setSessionMessage(null)
          const controller = new AbortController()
          exportAbort.current = controller
          const encoder = new TextEncoder()
          const packages = []
          const failures = []
          const skipped = []
          let bytes = 0

          for (let index = 0; index < ids.length; index += 1) {
            if (cancelRef.current === 'export') {
              for (let rest = index; rest < ids.length; rest += 1) skipped.push(ids[rest])
              break
            }
            const id = ids[index]
            try {
              const data = await fetchSessionArchive(id, controller.signal)
              if (bytes + data.length > ARCHIVE_LIMIT) {
                failures.push({ id, message: t('archiveTooLarge') })
                skipped.push(id)
                for (let rest = index + 1; rest < ids.length; rest += 1) skipped.push(ids[rest])
                break
              }
              packages.push({ id, data })
              bytes += data.length
            } catch (failure) {
              failures.push({ id, message: failure && failure.message ? failure.message : String(failure) })
            }
            setSessionBusy({ done: index + 1, total: ids.length })
          }
          cancelRef.current = null
          exportAbort.current = null

          if (packages.length === 0) {
            setSessionBusy(null)
            setSessionMessage({ kind: 'error', text: `${t('error')}: ${failures[0] ? failures[0].message : t('failed')}` })
            return
          }

          const packagesDigest = await digestHex(joinBytes(packages.map((entry) => entry.data)))
          const contentLine = locale === 'zh'
            ? `${packages.length} ${t('unitSessions')} · ${Math.round(bytes / 1024)} KB`
            : `${packages.length}${t('unitSessions')} · ${Math.round(bytes / 1024)} KB`
          const manifest = {
            kind: 'dsh-export-center/sessions',
            schema: 2,
            tool: { name: 'dsh-export-center', displayName: t('title'), version: BUILD_VERSION },
            app: { name: 'DeepSeek Harness', platform: typeof navigator !== 'undefined' ? String(navigator.platform || '') : '' },
            locale,
            exportedAt: clock.iso,
            timeZone: clock.timeZone,
            counts: { sessions: packages.length, bytes },
            packagesDigest,
            about: locale === 'zh'
              ? `本文件由 ${t('title')} ${BUILD_VERSION} 从 DeepSeek Harness 于 ${clock.display}（UTC${clock.offset}）导出，含 ${packages.length} 个会话。`
              : `Exported by ${t('title')} ${BUILD_VERSION} from DeepSeek Harness on ${clock.display} (UTC${clock.offset}); ${packages.length} Sessions.`,
            sessions: packages.map((entry) => {
              const row = rows.find((item) => item.id === entry.id)
              return {
                sessionId: entry.id,
                title: row ? row.title : '',
                updatedAt: row && row.ms > 0 ? new Date(row.ms).toISOString() : null,
                entry: `sessions/${entry.id}.zip`,
                bytes: entry.data.length,
              }
            }),
            failures,
            skipped,
          }
          const readme = archiveReadme(t, locale, {
            tool: `${t('title')} ${BUILD_VERSION}`,
            content: contentLine,
            time: `${clock.display} (UTC${clock.offset}${clock.timeZone === '' ? '' : `, ${clock.timeZone}`})`,
            source: `DeepSeek Harness${manifest.app.platform === '' ? '' : ` · ${manifest.app.platform}`}`,
          })
          const archive = zipStore([
            ['manifest.json', encoder.encode(JSON.stringify(manifest, null, 2))],
            ['README.md', encoder.encode(readme)],
            ...packages.map((entry) => [`sessions/${entry.id}.zip`, entry.data]),
          ])
          const stamp = `${started.getFullYear()}${String(started.getMonth() + 1).padStart(2, '0')}${String(started.getDate()).padStart(2, '0')}-${String(started.getHours()).padStart(2, '0')}${String(started.getMinutes()).padStart(2, '0')}`
          const prefix = locale === 'zh' ? '会话备份' : 'session-backup'
          const name = saveBinary(archive, `${prefix}-${stamp}.zip`, 'application/zip')
          setSessionBusy(null)
          setSessionMessage({
            kind: failures.length > 0 || skipped.length > 0 ? 'error' : 'info',
            text: `${t('done')} ${packages.length} ${t('doneSessions')} · ${Math.round(bytes / 1024)} KB`
              + (failures.length > 0 ? ` · ${failures.length} ✕` : '')
              + (skipped.length > 0 ? ` · ${t('skippedHint', { n: skipped.length })}` : '')
              + ` · ${t('archiveHint')}${name}`,
            skipped,
          })
        }

        /* ---------- session logs: import ---------- */

        /**
         * Upload one archive to the Host, which restores every Session inside it.
         * The Host owns writing: this half only carries the bytes and renders
         * the per-Session report it answers with.
         * @param file - the picked `.zip` archive.
         */
        const restoreArchive = async (file) => {
          if (file.size > ARCHIVE_LIMIT) {
            setSessionMessage({ kind: 'error', text: t('archiveTooLarge') })
            return
          }
          if (!hostReady) {
            setSessionMessage({ kind: 'error', text: t('hostMissingHint') })
            return
          }
          const controller = new AbortController()
          importAbort.current = controller
          setSessionBusy({ done: 0, total: 1 })
          setSessionMessage(null)
          setRestoreReport(null)
          setDuplicateWarning(false)
          try {
            const bytes = new Uint8Array(await file.arrayBuffer())
            const query = new URLSearchParams()
            if (targetWorkspace !== '') query.set('workspaceId', targetWorkspace)
            const archiveId = await digestHex(bytes)
            if (archiveId !== '') query.set('archiveId', archiveId)
            const response = await fetch(`api/export-center.import?${query.toString()}`, {
              method: 'POST',
              headers: { 'content-type': 'application/zip' },
              body: bytes,
              signal: controller.signal,
            })
            if (response.status === 404) throw new Error(t('hostMissing'))
            if (response.status === 401 || response.status === 403) throw new Error(t('authFailed'))
            const report = await response.json().catch(() => null)
            if (report === null) throw new Error(`HTTP ${response.status}`)
            if (Array.isArray(report.restored) === false) {
              throw new Error(report.error || `HTTP ${response.status}`)
            }
            setRestoreReport(report)
            setDuplicateWarning(report.duplicate === true)
            const failed = Array.isArray(report.failed) ? report.failed.length : 0
            setSessionMessage({
              kind: failed > 0 ? 'error' : 'info',
              text: `${t('restored')} ${report.restored.length} ${t('doneSessions')}`
                + (failed > 0 ? ` · ${failed} ✕` : '')
                + (report.duplicate === true ? ` · ${t('duplicateArchive')}` : ''),
              failed: Array.isArray(report.failed) ? report.failed : [],
            })
            await load()
          } catch (failure) {
            const cancelled = failure && (failure.name === 'AbortError' || failure.code === 20)
            setSessionMessage({
              kind: cancelled ? 'info' : 'error',
              text: cancelled
                ? t('exportCancelled')
                : `${t('error')}: ${failure && failure.message ? failure.message : String(failure)}`,
            })
          } finally {
            importAbort.current = null
            setSessionBusy(null)
          }
        }

        const onPickSessionFile = async (event) => {
          const input = event.target
          const file = input.files && input.files[0]
          if (!file) return
          try {
            await restoreArchive(file)
          } finally {
            if (input.value !== undefined) input.value = ''
          }
        }

        /* ---------- render ---------- */

        const sectionHeader = (label, hint, extra) => h('div', null,
          h('div', { style: styles.sectionTitle },
            h('span', null, label),
            extra ? h('span', { style: styles.mono }, extra) : null),
          hint ? h('p', { style: styles.hint }, hint) : null)

        const bundleRow = (entry) => h('label', { style: styles.row, key: entry.name },
          h('input', {
            type: 'checkbox',
            checked: bundlePicked.has(entry.name),
            onChange: () => toggleBundle(entry.name),
          }),
          h('span', { style: styles.rowTitle, title: `${entry.name}${entry.version ? `@${entry.version}` : ''}` }, bundleTitle(entry)),
          h('span', { style: styles.mono }, entry.version ? String(entry.version) : ''),
          entry.enabled === true ? h('span', { style: styles.mono }, t('bundleOn')) : null)

        const planStateLabel = (item) => item.state === 'install'
          ? t('importStateInstall')
          : item.state === 'enable'
            ? t('importStateEnable')
            : item.state === 'already'
              ? t('importStateAlready')
              : item.state === 'different'
                ? `${t('importStateDifferent')} (${item.note || ''})`
                : item.state === 'shipped'
                  ? t('importStateShipped')
                  : item.state === 'disabled'
                    ? t('importStateDisabled')
                    : `${t('importStateManual')}${item.note ? ` (${item.note})` : ''}`

        /** One plan row; installable and enableable rows carry a checkbox. */
        const planRow = (item) => h('label', {
          style: { ...styles.row, cursor: item.state === 'install' || item.state === 'enable' ? 'pointer' : 'default' },
          key: item.name,
          title: `${item.name}${item.version ? `@${item.version}` : ''}`,
        },
          item.state === 'install' || item.state === 'enable'
            ? h('input', {
              type: 'checkbox',
              checked: item.checked !== false,
              disabled: importBusy !== null,
              onChange: () => togglePlanItem(item.name),
            })
            : h('span', { style: { ...styles.mono, width: '13px' } }, ''),
          h('span', { style: styles.rowTitle }, item.title || item.name),
          h('span', { style: styles.mono }, item.version ? String(item.version) : ''),
          item.spec ? h('span', {
            style: { ...styles.mono, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            title: item.spec,
          }, item.spec) : null,
          h('span', { style: styles.mono }, planStateLabel(item)))

        const groups = React.useMemo(() => splitBundles(bundles), [bundles])

        const runningVersion = BUILD_VERSION
        const selfBundle = bundles.find((entry) => entry && entry.name === PLUGIN_ID)
        const sourcePath = selfBundle && typeof selfBundle.source === 'string' ? selfBundle.source : ''

        const planItems = importPlan ? importPlan.items : []
        // Only rows that carry a checkbox are "actionable"; different/manual
        // rows are shown for context and counted separately.
        const planActionable = planItems.filter((item) => item.state === 'install'
          || item.state === 'enable')
        const planManual = planItems.filter((item) => item.state === 'different' || item.state === 'manual')
        const planIdle = planItems.length - planActionable.length - planManual.length
        const planPending = planActionable.filter((item) => item.checked !== false)
        const PLAN_ROWS = 60
        const planVisible = planExpanded ? planActionable : planActionable.slice(0, PLAN_ROWS)
        const planHidden = planActionable.length - planVisible.length

        const selectEnabledBundles = () => {
          setBundlePicked(new Set(groups.migratable
            .filter((entry) => entry.enabled === true)
            .map((entry) => entry.name)))
        }

        const selectAllBundles = () => {
          setBundlePicked(new Set(groups.migratable.map((entry) => entry.name)))
        }

        const pluginsSection = () => h('section', { style: styles.section },
          sectionHeader(t('plugins'), t('pluginsHint'),
            `${bundlePicked.size} ${t('bundleSelected')} / ${groups.migratable.length}`),
          pluginStatus === 'loading' ? h('p', { style: styles.hint }, t('loading')) : null,
          pluginStatus === 'error'
            ? h('p', { style: styles.danger }, `${t('failed')}: ${pluginError}`)
            : null,
          h('div', { style: styles.toolbar },
            h('button', { style: styles.button, onClick: selectEnabledBundles }, t('selectEnabled')),
            h('button', { style: styles.button, onClick: selectAllBundles }, t('selectAll')),
            h('button', {
              style: styles.button,
              onClick: () => setBundlePicked(new Set()),
              disabled: bundlePicked.size === 0,
            }, t('selectNone'))),

          groups.migratable.length === 0
            ? null
            : h('div', { style: styles.list }, groups.migratable.map(bundleRow)),

          groups.shipped.length === 0 ? null : h('div', { style: { marginTop: '10px' } },
            h('button', {
              style: styles.button,
              onClick: () => setShowOfficial((value) => !value),
            }, `${t('officialGroup')} (${groups.shipped.length}) · ${showOfficial ? t('collapse') : t('expand')}`),
            showOfficial ? h('div', null,
              h('p', { style: styles.hint }, t('officialHint')),
              h('div', { style: styles.list }, groups.shipped.map((entry) => h('div', {
                style: styles.row,
                key: entry.name,
                title: `${entry.name}${entry.version ? `@${entry.version}` : ''}`,
              },
                h('span', { style: styles.rowTitle }, bundleTitle(entry)),
                h('span', { style: styles.mono }, entry.version ? String(entry.version) : ''))))) : null),

          importPlan ? h('div', null,
            h('p', { style: styles.hint }, `${t('importPlan')}: ${importPlan.fileName}`
              + (planPending.length > 0 ? ` · ${planPending.length} ${t('planSelected')}` : '')),
            planActionable.length === 0
              ? h('p', { style: styles.hint }, t('importEmpty'))
              : h('div', { style: styles.list }, planVisible.map(planRow)),
            planHidden > 0
              ? h('button', {
                style: { ...styles.button, marginTop: '8px' },
                onClick: () => setPlanExpanded(true),
              }, `${t('planMore')} ${planHidden} ${t('planMoreRows')} · ${t('planShowAll')}`)
              : null,
            planExpanded && planActionable.length > PLAN_ROWS
              ? h('button', {
                style: { ...styles.button, marginTop: '8px' },
                onClick: () => setPlanExpanded(false),
              }, t('planShowLess'))
              : null,
            planIdle > 0 ? h('p', { style: styles.hint }, `${planIdle} ${t('planRest')}`) : null,
            planManual.length > 0 ? h('div', null,
              h('p', { style: styles.danger }, `${planManual.length} ${t('planManualHint')}`),
              h('div', { style: styles.list }, planManual.map(planRow))) : null,
            importResults && importResults.length > 0 ? h('div', null,
              h('p', { style: styles.danger }, `${t('importDone')} · ${t('planFailed')}`),
              h('div', { style: styles.list }, importResults.map((failure) => h('div', {
                style: styles.row,
                key: failure.name,
              },
                h('span', { style: styles.rowTitle, title: failure.name }, failure.name),
                h('span', { style: { ...styles.mono, ...styles.danger } }, failure.reason))))) : null) : null,

          importMessage ? h('p', {
            style: importMessage.kind === 'error' ? styles.danger : styles.status,
          }, importMessage.text) : null,

          h('div', { style: styles.sectionFooter },
            h('button', {
              style: styles.primary,
              onClick: exportPlugins,
              disabled: pluginBusy !== null,
            }, t('pluginsExport')),
            h('input', {
              type: 'file',
              ref: pluginFileRef,
              accept: '.json,application/json',
              onChange: onPickPluginFile,
              style: { display: 'none' },
            }),
            h('button', {
              style: styles.button,
              onClick: () => { if (pluginFileRef.current) pluginFileRef.current.click() },
            }, t('pluginsImport')),
            h('button', {
              style: styles.button,
              onClick: runPluginImport,
              disabled: importBusy !== null || planPending.length === 0,
            }, importBusy === null ? t('importApply') : `${t('importImporting')} ${importBusy.done}/${importBusy.total}`),
            pluginMessage ? h('span', {
              role: 'status',
              'aria-live': 'polite',
              style: pluginMessage.kind === 'error' ? styles.danger : styles.status,
            }, pluginMessage.text) : null))

        const sessionRow = (row) => h('label', { style: styles.row, key: row.id },
          h('input', {
            type: 'checkbox',
            checked: selected.has(row.id),
            onChange: () => toggleSession(row.id),
          }),
          h('span', { style: styles.rowTitle, title: row.cwd || row.title }, row.title),
          row.cwd !== '' ? h('span', {
            style: { ...styles.mono, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            title: row.cwd,
          }, row.cwd) : null,
          h('span', { style: styles.mono }, row.ms > 0 ? `${t('updated')} ${formatTime(row.ms)}` : t('noDate')),
          h('span', { style: styles.mono }, row.id.slice(0, 8)))

        const sessionsSection = () => h('section', { style: styles.section },
          sectionHeader(t('sessions'), t('sessionsHint'),
            `${selectedCount} ${t('bundleSelected')} / ${filtered.length}`
            + (hiddenSelected > 0 ? ` · ${hiddenSelected} ${t('hiddenSelected')}` : '')),

          sessionStatus === 'loading' ? h('p', { style: styles.hint }, t('loading')) : null,
          sessionStatus === 'error'
            ? h('p', { style: styles.danger }, `${t('failed')}: ${sessionError}`)
            : null,
          hostReady ? null : h('p', {
            style: styles.danger,
            role: 'alert',
          }, authIssue ? t('authBanner') : t('hostMissingHint')),

          h('div', { style: styles.toolbar },
            h('input', {
              style: { ...styles.input, minWidth: '220px' },
              placeholder: t('search'),
              value: query,
              onChange: (event) => setQuery(event.target.value),
            }),
            h('label', { style: { ...styles.row, gap: '4px' } },
              h('span', null, t('from')),
              h('input', {
                style: styles.input, type: 'date', value: from,
                onChange: (event) => setFrom(event.target.value),
              })),
            h('label', { style: { ...styles.row, gap: '4px' } },
              h('span', null, t('to')),
              h('input', {
                style: styles.input, type: 'date', value: to,
                onChange: (event) => setTo(event.target.value),
              })),
            h('button', { style: styles.button, onClick: () => applyRange(1) }, t('rangeToday')),
            h('button', { style: styles.button, onClick: () => applyRange(7) }, t('rangeWeek')),
            h('button', { style: styles.button, onClick: () => applyRange(null) }, t('rangeAll')),
            h('button', { style: styles.button, onClick: selectFiltered }, t('selectFiltered')),
            h('button', { style: styles.button, onClick: clearSelection, disabled: selectedCount === 0 }, t('clearSelection'))),

          filtered.length === 0
            ? (sessionStatus === 'loading' ? null : h('p', { style: styles.hint }, t('noSessions')))
            : h('div', { style: styles.list }, visible.map(sessionRow)),

          filtered.length > 50
            ? h('button', {
              style: { ...styles.button, marginTop: '8px' },
              onClick: () => setShowAll((value) => !value),
            }, showAll ? t('showLess') : `${t('showAll')} (${filtered.length})`)
            : null,

          restoreReport ? h('div', { style: styles.preview },
            h('p', { style: { margin: 0, fontWeight: 600 } },
              `${t('restoreTitle')}: ${restoreReport.restored.length}`),
            restoreReport.restored.length === 0 ? null : h('div', { style: styles.list },
              restoreReport.restored.map((item) => h('div', {
                style: styles.row,
                key: item.sessionId,
              },
                h('span', { style: styles.rowTitle, title: item.sessionId }, item.title || item.sourceSessionId),
                h('span', {
                  style: {
                    ...styles.mono,
                    ...(item.workspace && item.workspace.mode === 'fallback' ? styles.danger : {}),
                  },
                  title: item.workspace ? `${item.workspace.path} (${item.workspace.mode})` : '',
                }, item.workspace
                  ? `${item.workspace.path}${item.workspace.mode === 'fallback' ? ` · ${t('workspaceFallback')}` : ''}`
                  : (item.cwd || '—')),
                h('span', { style: styles.mono }, `${item.events} ${t('events')}`),
                item.subagents > 0 ? h('span', { style: styles.mono }, `+${item.subagents}`) : null))),
            restoreReport.attachments !== undefined
              && (restoreReport.attachments.images > 0 || restoreReport.attachments.files > 0)
              ? h('p', { style: styles.hint },
                `${t('restoreAttachments')} ${restoreReport.attachments.images} · ${restoreReport.attachments.files}`)
              : null,
            restoreReport.attachments !== undefined
              && Array.isArray(restoreReport.attachments.converted)
              && restoreReport.attachments.converted.length > 0
              ? h('p', { style: styles.hint },
                `${t('attachmentsConverted')}: ${restoreReport.attachments.converted.length}`)
              : null,
            duplicateWarning ? h('p', { style: styles.danger, role: 'alert' }, t('duplicateHint')) : null,
            restoreReport.failed && restoreReport.failed.length > 0 ? h('div', null,
              h('p', { style: styles.danger }, t('restoreFailures')),
              (showAllFailures ? restoreReport.failed : restoreReport.failed.slice(0, 20)).map((item) => h('p', {
                style: { ...styles.mono, ...styles.danger },
                key: `${item.entry}:${item.reason}`,
              }, `${item.entry}: ${item.reason}`
                + (item.residualSessionId ? ` · ${t('residualHint')} ${item.residualSessionId}` : ''))),
              restoreReport.failed.length > 20
                ? h('button', {
                  style: styles.button,
                  onClick: () => setShowAllFailures((value) => !value),
                }, showAllFailures ? t('showLessErrors') : `${t('showAllErrors')} (${restoreReport.failed.length})`)
                : null) : null) : null,

          sessionMessage ? h('p', {
            role: 'status',
            'aria-live': 'polite',
            style: sessionMessage.kind === 'error' ? styles.danger : styles.status,
          }, sessionMessage.text) : null,
          sessionMessage && Array.isArray(sessionMessage.skipped) && sessionMessage.skipped.length > 0
            ? h('p', { style: styles.danger }, `${t('skippedTitle')}: ${sessionMessage.skipped.length}`)
            : null,

          h('div', { style: styles.sectionFooter },
            h('button', {
              style: styles.primary,
              onClick: exportSessions,
              disabled: sessionBusy !== null,
            }, sessionBusy === null
              ? t('sessionsExport')
              : `${t('exporting')} ${sessionBusy.done}/${sessionBusy.total}`),
            sessionBusy === null ? null : h('button', {
              style: styles.button,
              onClick: cancelBusy,
            }, t('cancel')),

            workspaces.length === 0 ? null : h('label', { style: { ...styles.row, gap: '4px' } },
              h('span', null, t('importTarget')),
              h('select', {
                value: targetWorkspace,
                onChange: (event) => setTargetWorkspace(event.target.value),
                style: styles.input,
                disabled: sessionBusy !== null,
              }, workspaces.map((workspace) => h('option', { value: workspace.id, key: workspace.id },
                workspace.title ? `${workspace.title} — ${workspace.path}` : workspace.path)))),

            h('input', {
              type: 'file',
              ref: sessionFileRef,
              accept: '.zip,application/zip',
              onChange: onPickSessionFile,
              style: { display: 'none' },
            }),
            h('button', {
              style: styles.button,
              title: hostReady ? t('archivePickHint') : t('hostMissingHint'),
              disabled: !hostReady || sessionBusy !== null,
              onClick: () => { if (sessionFileRef.current) sessionFileRef.current.click() },
            }, t('sessionsImport'))))

        return h('div', { style: styles.page },
          h('div', { style: styles.scroller },
            h('div', { style: styles.content },
          h('div', { style: styles.headerRow },
            h('h1', { style: styles.title }, t('title')),
            h('span', { style: styles.mono, title: t('versionTitle') }, runningVersion ? `v${runningVersion}` : ''),
            h('span', { style: styles.mono, title: t('exportLanguage') },
              `${t('exportLanguage')}: ${activeLanguage(ctx) === 'zh' ? '中文' : 'English'}`),
            h('button', { style: styles.button, onClick: load }, t('refresh')),
            h('button', {
              style: styles.button,
              onClick: () => setShowVersion((value) => !value),
              title: t('versionTitle'),
              'aria-label': t('versionTitle'),
              'aria-expanded': showVersion,
            }, 'ⓘ')),

          showVersion ? h('div', { style: styles.preview },
            h('p', { style: { margin: 0 } }, `${t('versionTitle')}: ${runningVersion || '—'}`),
            h('p', { style: styles.hint }, `${t('versionSource')}: ${sourcePath || '—'}`),
            h('p', { style: styles.hint }, t('updateHint'))) : null,

          hotRebuilt ? h('div', { style: styles.preview },
            h('p', { style: { margin: 0 } }, t('hotRebuilt')),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
              h('button', {
                style: styles.button,
                onClick: () => { setHotRebuilt(false); load() },
              }, t('hotReloadNow')),
              h('button', {
                style: styles.button,
                onClick: () => {
                  setHotRebuilt(false)
                  if (typeof location !== 'undefined' && typeof location.reload === 'function') location.reload()
                },
              }, t('hotReloadPage')))) : null,

          h('p', { style: styles.subtitle }, t('subtitle')),

          pluginsSection(),
          sessionsSection(),
        )))
      }
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.pluginManager', 'remote.session'],
      apply(ctx) {
        ctx.locale.register(NS, { zh, en })
        const PanelIcon = ({ size }) => h('svg', {
          viewBox: '0 0 24 24',
          width: typeof size === 'number' ? size : 18,
          height: typeof size === 'number' ? size : 18,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
          h('path', { d: 'M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15' }),
          h('path', { d: 'M12 4v10' }),
          h('path', { d: 'M8 10l4 4 4-4' }))

        const Page = createPage(ctx)
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, Page))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 30,
          locale: NS,
          label: () => t('panel'),
        }, PanelIcon))
      },
    }
  },
})
