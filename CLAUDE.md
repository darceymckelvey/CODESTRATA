# CLAUDE.md - Guidelines for Agentic Coding Assistants

## Code Style Guidelines
- **TypeScript**: Use strong typing throughout the codebase
- **Imports**: Group imports by origin (Angular, third-party, local)
- **Formatting**: Follow Prettier/ESLint rules
- **Naming**: Use camelCase for variables/methods, PascalCase for classes/interfaces
- **API Responses**: Follow format `{ success, data, error }`
- **Error Handling**: Use try/catch with specific error codes
- **State Management**: Use services with RxJS reactive patterns
- **Authentication**: JWT tokens with refresh mechanism
- **Models**: Use Sequelize ORM for database operations
- **Commit Style**: Clear, concise messages describing changes

## Project Structure
- Full-stack TypeScript application
- Angular frontend with Material UI and TailwindCSS
- Node.js/Express backend with Sequelize ORM
- RESTful API architecture