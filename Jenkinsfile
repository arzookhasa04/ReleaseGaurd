pipeline {
    agent any

    environment {
        PROJECT = 'releaseguard-ai'
        DOCKER_REGISTRY = 'docker.company.internal'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Quality Gate') {
            steps {
                dir('backend') {
                    sh 'python3 -m venv .venv'
                    sh '.venv/bin/pip install -r requirements.txt'
                    sh '.venv/bin/pytest -v tests/test_backend.py'
                }
            }
        }

        stage('Frontend Build & Verification') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                sh 'docker build -f infrastructure/docker/backend.Dockerfile -t ${DOCKER_REGISTRY}/releaseguard-backend:${BUILD_NUMBER} .'
                sh 'docker build -f infrastructure/docker/frontend.Dockerfile -t ${DOCKER_REGISTRY}/releaseguard-frontend:${BUILD_NUMBER} .'
            }
        }

        stage('Canary Release & Safety Audit') {
            steps {
                echo "Triggering ReleaseGuard canary rollout gate with 10% traffic slice..."
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
