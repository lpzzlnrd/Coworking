use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Tipo de recurso que representa el espacio.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    Desk,
    MeetingRoom,
    Office,
    Other(String),
}

impl From<String> for ResourceType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "desk" => Self::Desk,
            "meeting_room" => Self::MeetingRoom,
            "office" => Self::Office,
            _ => Self::Other(s),
        }
    }
}

impl From<ResourceType> for String {
    fn from(rt: ResourceType) -> Self {
        match rt {
            ResourceType::Desk => "desk".to_string(),
            ResourceType::MeetingRoom => "meeting_room".to_string(),
            ResourceType::Office => "office".to_string(),
            ResourceType::Other(s) => s,
        }
    }
}

// Entidad Space: Proyección local o referencia al espacio físico.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Space {
    pub id: Uuid,
    pub name: String,
    pub resource_type: ResourceType,
    pub capacity: i32,
    pub is_active: bool,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Space {
    pub fn new(id: Uuid, name: String, resource_type: ResourceType, capacity: i32) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            resource_type,
            capacity,
            is_active: true,
            metadata: serde_json::json!({}),
            created_at: now,
            updated_at: now,
        }
    }
}
