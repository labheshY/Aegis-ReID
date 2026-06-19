export function fromBackend(data: any) {
  return {
    minBoxConfidence: data.min_box_confidence,
    minBoxWidth: data.min_box_width,
    minBoxHeight: data.min_box_height,

    targetConfirmation: data.target_confirmation,

    trackBuffer: data.track_buffer,
    matchThreshold: data.match_thresh,

    track_high_thresh: data.track_high_thresh,
    track_low_thresh: data.track_low_thresh,
    new_track_thresh: data.new_track_thresh,

    similarity_threshold: data.similarity_threshold,
    max_embeddings: data.max_embeddings,

    reid_frame_interval: data.reid_frame_interval,
    acquisition_frame_interval: data.acquisition_frame_interval,

    use_soft_decay: data.use_soft_decay,
    soft_decay_rate: data.soft_decay_rate,

    tracking_mode: data.tracking_mode,

    face_threshold: data.face_threshold,
    face_model: data.face_model,
    face_detector: data.face_detector,
    hybrid_face_weight: data.hybrid_face_weight,
  };
}

export function toBackend(settings: any) {
  return {
    min_box_confidence: settings.minBoxConfidence,
    min_box_width: settings.minBoxWidth,
    min_box_height: settings.minBoxHeight,

    target_confirmation: settings.targetConfirmation,

    track_buffer: settings.trackBuffer,
    match_thresh: settings.matchThreshold,

    track_high_thresh: settings.track_high_thresh,
    track_low_thresh: settings.track_low_thresh,
    new_track_thresh: settings.new_track_thresh,

    similarity_threshold: settings.similarity_threshold,
    max_embeddings: settings.max_embeddings,

    reid_frame_interval: settings.reid_frame_interval,
    acquisition_frame_interval: settings.acquisition_frame_interval,

    use_soft_decay: settings.use_soft_decay,
    soft_decay_rate: settings.soft_decay_rate,

    tracking_mode: settings.tracking_mode,

    face_threshold: settings.face_threshold,
    face_model: settings.face_model,
    face_detector: settings.face_detector,
    hybrid_face_weight: settings.hybrid_face_weight,
  };
}