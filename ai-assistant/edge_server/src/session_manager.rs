use dashmap::DashMap;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

const CONNECTED_WINDOW_SECS: u64 = 120;

pub struct SessionManager {
    sessions: DashMap<String, SessionData>,
    devices: DashMap<String, DeviceRecord>,
}

pub struct SessionData {
    pub last_seen: u64,
    pub context: Vec<String>,
}

struct DeviceRecord {
    pub id: String,
    pub last_seen: u64,
}

#[derive(Clone, Serialize)]
pub struct DeviceSnapshot {
    pub id: String,
    pub name: String,
    pub status: String,
}

fn unix_timestamp_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: DashMap::new(),
            devices: DashMap::new(),
        }
    }

    pub fn update_session(&self, device_id: &str, query: &str) {
        let now = unix_timestamp_secs();
        let key = device_id.trim();
        if key.is_empty() {
            return;
        }

        let mut session = self.sessions.entry(key.to_string()).or_insert(SessionData {
            last_seen: now,
            context: Vec::new(),
        });

        session.last_seen = now;
        session.context.push(query.to_string());
        if session.context.len() > 10 {
            session.context.remove(0);
        }

        if key != "browser-control-ui" {
            self.record_device_seen(key);
        }
    }

    pub fn record_device_seen(&self, device_id: &str) {
        let key = device_id.trim();
        if key.is_empty() {
            return;
        }

        let now = unix_timestamp_secs();
        self.devices
            .entry(key.to_string())
            .and_modify(|device| {
                device.last_seen = now;
            })
            .or_insert(DeviceRecord {
                id: key.to_string(),
                last_seen: now,
            });
    }

    pub fn list_devices(&self) -> Vec<DeviceSnapshot> {
        let now = unix_timestamp_secs();
        let mut devices: Vec<DeviceSnapshot> = self
            .devices
            .iter()
            .map(|entry| {
                let record = entry.value();
                let status = if now.saturating_sub(record.last_seen) <= CONNECTED_WINDOW_SECS {
                    "connected"
                } else {
                    "disconnected"
                };

                DeviceSnapshot {
                    id: record.id.clone(),
                    name: record.id.clone(),
                    status: status.to_string(),
                }
            })
            .collect();

        devices.sort_by(|left, right| left.id.cmp(&right.id));
        devices
    }
}
