import settings from '../config/settings'
import { Artifact } from '../types/artifacts'

// Determine which CDN root URL to use based on artifact kind
const getArtifactRootUrl = (kind: string): string => {
  switch (kind) {
    case 'RENDERED_MODEL_GLB_COMPARISON_SAMPLE':
      return settings.external_object_cdn_root_url

    case 'NBT_STRUCTURE_FILE':
    case 'PROMPT':
    case 'ORIGINAL_BUILD_SCRIPT_JS':
    case 'ORIGINAL_BUILD_SCRIPT_PY':
    case 'RAW_RESPONSE':
    case 'BUILD_SCHEMATIC':
    case 'BUILD_COMMAND_LIST':
    case 'BUILD_SUMMARY':
    case 'COMMAND_LIST_BUILD_SCRIPT_JS':
    case 'COMMAND_LIST_BUILD_SCRIPT_PY':
    case 'CONTENT_EXPORT_BUILD_SCRIPT_JS':
    case 'CONTENT_EXPORT_BUILD_SCRIPT_PY':
    case 'NORTHSIDE_CAPTURE_PNG':
    case 'EASTSIDE_CAPTURE_PNG':
    case 'SOUTHSIDE_CAPTURE_PNG':
    case 'WESTSIDE_CAPTURE_PNG':
    case 'BUILD_CINEMATIC_MP4':
    case 'RENDERED_MODEL_GLB':
    default:
      return settings.object_cdn_root_url
  }
}

export const getArtifactUrl = (artifact: Artifact): string => {
  const rootUrl = getArtifactRootUrl(artifact.kind)

  // If the CDN root URL already includes bucket info, just append the key
  if (rootUrl.includes('mcbench.ai')) {
    return `${rootUrl}/${artifact.key}`
  }
  // Otherwise include the bucket in the path
  return `${rootUrl}/${artifact.bucket}/${artifact.key}`
}

export const getDisplayFileName = (artifact: Artifact): string => {
  if (artifact.kind === 'RENDERED_MODEL_GLB_COMPARISON_SAMPLE') {
    return 'sample.glb'
  }

  // Get the last part of the path
  const filename = artifact.key.split('/').pop() || ''

  // Remove UUID_UUID_TIMESTAMP pattern and timestamp prefix, keep only the descriptive part
  return filename
    .replace(/^[a-f0-9-]+_[a-f0-9-]+_[\d-T_:.]+?-/, '') // Remove UUID_UUID_TIMESTAMP-
    .replace(/^\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\.\d+[-_]/, '') // Remove remaining timestamp
}

export const getDisplayArtifactKind = (kind: string): string => {
  const kindMap: Record<string, string> = {
    NBT_STRUCTURE_FILE: 'NBT Structure File',
    PROMPT: 'Prompt',
    ORIGINAL_BUILD_SCRIPT_JS: 'Original Build Script (JavaScript)',
    ORIGINAL_BUILD_SCRIPT_PY: 'Original Build Script (Python)',
    RAW_RESPONSE: 'Raw Response',
    BUILD_SCHEMATIC: 'Build Schematic',
    BUILD_COMMAND_LIST: 'Build Command List',
    BUILD_SUMMARY: 'Build Summary',
    COMMAND_LIST_BUILD_SCRIPT_JS: 'Command List Build Script (JavaScript)',
    COMMAND_LIST_BUILD_SCRIPT_PY: 'Command List Build Script (Python)',
    CONTENT_EXPORT_BUILD_SCRIPT_JS: 'Content Export Build Script (JavaScript)',
    CONTENT_EXPORT_BUILD_SCRIPT_PY: 'Content Export Build Script (Python)',
    NORTHSIDE_CAPTURE_PNG: 'North Side Capture',
    EASTSIDE_CAPTURE_PNG: 'East Side Capture',
    SOUTHSIDE_CAPTURE_PNG: 'South Side Capture',
    WESTSIDE_CAPTURE_PNG: 'West Side Capture',
    BUILD_CINEMATIC_MP4: 'Build Timelapse',
    RENDERED_MODEL_GLB: '3D Model',
    RENDERED_MODEL_GLB_COMPARISON_SAMPLE: '3D Model (sample)',
  }
  return kindMap[kind] || 'Miscellaneous Artifact'
}
