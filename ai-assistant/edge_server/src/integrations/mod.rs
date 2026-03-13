pub mod google;
pub mod meta;

pub enum IntegrationResult {
    Handled(String),
    NotHandled,
}

pub async fn handle_integrations(_query: &str) -> IntegrationResult {
    IntegrationResult::NotHandled
}
