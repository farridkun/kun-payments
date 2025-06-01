pipeline {
    agent any

    environment {
        COMPOSE_FILE = "docker-compose.yml"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Create .env File') {
            steps {
                script {
                    writeFile file: '.env', text: '''
                    MIDTRANS_CLIENT_KEY=SB-Mid-client-zv7sPGTAF6qOmz1b
                    MIDTRANS_SERVER_KEY=SB-Mid-server-03jtYdI9NAl9QyqafvcigZRd
                    MIDTRANS_MERCHANT_ID=G245997457
                    MIDTRANS_URL=https://api.sandbox.midtrans.com/v2/
                    PAYMENT_DB_URI=mongodb://admin:123qwe022@159.89.204.161:27017/payments_m?authSource=admin
                    RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
                    '''.stripIndent()
                }
            }
        }

        stage('Stop Current Containers') {
            steps {
                sh 'docker-compose down'
            }
        }

        stage('Build Docker Containers') {
            steps {
                sh 'docker-compose build'
            }
        }

        stage('Start Containers') {
            steps {
                sh 'docker-compose up -d'
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful!"
        }
        failure {
            echo "❌ Deployment failed. Please check logs."
        }
    }
}
